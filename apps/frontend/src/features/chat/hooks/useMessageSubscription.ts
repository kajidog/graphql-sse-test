import { useApolloClient } from "@apollo/client";
import { useCallback, useEffect, useRef } from "react";
import { useOnMessageAddedSubscription } from "@/graphql/generated";
import { setConnectionStatus } from "@/lib/connectionStatus";
import { appendMessageToCache } from "../cache";

// 指数バックオフの設定（ms）
const BASE_DELAY = 1_000;
const MAX_DELAY = 30_000;

export interface UseMessageSubscriptionReturn {
  // 即時再接続（手動の「再接続」ボタンや、ネットワーク復帰時に使う）
  reconnect: () => void;
}

/**
 * messageAdded サブスクリプションを購読し、切断時の自動再接続を hook 側で制御する。
 *
 * 設計:
 *  - 接続状態（connecting / connected）は graphql-sse のライフサイクルイベントが
 *    `connectionStatus` ストアへ書き込む（apollo.ts 参照）。
 *  - 切断（disconnected）と再接続ポリシー（指数バックオフ + restart）はこの hook が持つ。
 *  - Apollo の useSubscription をそのまま使い、3.8+ の `restart()` で再購読する。
 */
export function useMessageSubscription(): UseMessageSubscriptionReturn {
  const client = useApolloClient();

  // 再接続の状態は再レンダーをまたいで保持したいので ref で持つ
  const retryCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // restart は毎レンダー新しい参照になり得るので、最新を ref に逃がす
  const restartRef = useRef<() => void>(() => {});

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 指数バックオフ + ジッターで再接続を予約する
  const scheduleReconnect = useCallback(() => {
    clearTimer();
    const attempt = retryCountRef.current;
    const base = Math.min(BASE_DELAY * 2 ** attempt, MAX_DELAY);
    const delay = base + Math.random() * 0.3 * base; // 同時再接続を散らすジッター
    timerRef.current = setTimeout(() => {
      retryCountRef.current += 1;
      setConnectionStatus("connecting");
      restartRef.current();
    }, delay);
  }, [clearTimer]);

  const { restart } = useOnMessageAddedSubscription({
    fetchPolicy: "no-cache",
    onData: ({ data: subscriptionData }) => {
      // データが届いた＝接続は健全。バックオフをリセットする
      retryCountRef.current = 0;
      clearTimer();
      setConnectionStatus("connected");

      if (subscriptionData.error) {
        console.error("[SSE] Subscription GraphQL error:", subscriptionData.error);
        return;
      }

      const newMessage = subscriptionData.data?.messageAdded;
      if (!newMessage) {
        return;
      }
      // Apollo キャッシュを更新して新着メッセージを反映
      appendMessageToCache(client.cache, newMessage);
    },
    onError: (error) => {
      // トランスポートのリトライは無効化しているので、切断は即ここに届く
      console.error("[SSE] Subscription error:", error);
      setConnectionStatus("disconnected");
      scheduleReconnect();
    },
    onComplete: () => {
      // サーバー側からストリームが閉じられたケース。再接続を試みる
      setConnectionStatus("disconnected");
      scheduleReconnect();
    },
  });

  // 最新の restart を ref に同期
  restartRef.current = restart;

  // バックオフを待たずに今すぐ再接続する
  const reconnect = useCallback(() => {
    clearTimer();
    retryCountRef.current = 0;
    setConnectionStatus("connecting");
    restartRef.current();
  }, [clearTimer]);

  // ネットワーク復帰・タブ復帰時は待たずに再接続する
  useEffect(() => {
    const handleOnline = () => reconnect();
    const handleVisible = () => {
      if (document.visibilityState === "visible") reconnect();
    };
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisible);
      clearTimer();
    };
  }, [reconnect, clearTimer]);

  return { reconnect };
}

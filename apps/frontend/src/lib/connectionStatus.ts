import { useSyncExternalStore } from "react";

/**
 * SSE サブスクリプション接続の状態。
 * - connecting:    初回接続を試みている
 * - connected:     接続確立済み（正常）
 * - reconnecting:  一度切れて再接続を試みている
 * - disconnected:  恒久的に切断（致命的エラー／リトライ枯渇）
 */
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

let status: ConnectionStatus = "connecting";
const statusListeners = new Set<() => void>();
const reconnectedListeners = new Set<() => void>();

// graphql-sse のライフサイクルイベントから呼ばれ、現在の状態を更新する
export function setConnectionStatus(next: ConnectionStatus): void {
  if (status === next) return;
  status = next;
  statusListeners.forEach((listener) => listener());
}

// 再接続が成功したタイミングで呼ぶ（切断中の取りこぼしを埋めるトリガー）
export function notifyReconnected(): void {
  reconnectedListeners.forEach((listener) => listener());
}

// 再接続成功イベントを購読する。解除用の関数を返す
export function onReconnected(listener: () => void): () => void {
  reconnectedListeners.add(listener);
  return () => {
    reconnectedListeners.delete(listener);
  };
}

function subscribe(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function getSnapshot(): ConnectionStatus {
  return status;
}

// React コンポーネントから接続状態を購読する
export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

import { useCallback } from "react";
import {
  useSendMessageMutation,
} from "@/graphql/generated";
import type { ChatMessage, UseSendMessageOptions, UseSendMessageReturn } from "../types";
import { appendMessageToCache } from "../cache";

export function useSendMessage(
  options?: UseSendMessageOptions
): UseSendMessageReturn {
  const [sendMessageMutation, { loading, error }] = useSendMessageMutation({
    update: (cache, { data }) => {
      if (!data?.sendMessage) return;
      // キャッシュに存在する場合のみ、重複を避けて追加
      appendMessageToCache(cache, data.sendMessage);
    },
  });

  const sendMessage = useCallback(
    async (content: string): Promise<ChatMessage> => {
      // ミューテーションの実行
      const result = await sendMessageMutation({
        variables: { content },
      });

      // GraphQLエラーを明示的に扱う
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }

      // 期待したデータが無い場合はアプリ側で扱いやすいエラーに変換
      if (!result.data?.sendMessage) {
        throw new Error("メッセージの送信に失敗しました");
      }

      const message: ChatMessage = {
        id: result.data.sendMessage.id,
        content: result.data.sendMessage.content,
        createdAt: result.data.sendMessage.createdAt,
        user: {
          id: result.data.sendMessage.user.id,
          nickname: result.data.sendMessage.user.nickname,
        },
      };

      // 呼び出し元の追加処理があれば実行
      options?.onSuccess?.(message);
      return message;
    },
    [sendMessageMutation, options]
  );

  return {
    sendMessage,
    loading,
    error: error ? new Error(error.message) : null,
  };
}

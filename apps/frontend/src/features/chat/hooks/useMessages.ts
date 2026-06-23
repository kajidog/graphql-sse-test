import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { GetMessagesDocument } from "../graphql/chat.chat";
import type { ChatMessage, UseMessagesReturn } from "../types";

export function useMessages(): UseMessagesReturn {
  const { data, loading, error, refetch } = useQuery(GetMessagesDocument, {
    fetchPolicy: "cache-and-network",
  });

  // 生成された型からUI向けの型へ変換（将来のAPI変更に備える）
  const messages: ChatMessage[] = useMemo(() => {
    if (!data?.messages) {
      return [];
    }

    return data.messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      createdAt: msg.createdAt,
      user: {
        id: msg.user.id,
        nickname: msg.user.nickname,
      },
    }));
  }, [data?.messages]);

  return {
    messages,
    loading,
    error: error ? new Error(error.message) : null,
    // refetch をUI側の API として統一
    refetch: async () => {
      await refetch();
    },
  };
}

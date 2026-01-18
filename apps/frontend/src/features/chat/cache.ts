import type { ApolloCache } from "@apollo/client";
import { GetMessagesDocument, type GetMessagesQuery } from "@/graphql/generated";

type MessageItem = GetMessagesQuery["messages"][number];

// メッセージの重複を避けつつキャッシュへ追加する
export const appendMessageToCache = (
  cache: ApolloCache<unknown>,
  newMessage: MessageItem
): boolean => {
  const existingData = cache.readQuery<GetMessagesQuery>({
    query: GetMessagesDocument,
  });

  if (!existingData) {
    return false;
  }

  const exists = existingData.messages.some((m) => m.id === newMessage.id);
  if (exists) {
    return false;
  }

  cache.writeQuery<GetMessagesQuery>({
    query: GetMessagesDocument,
    data: {
      messages: [...existingData.messages, newMessage],
    },
  });

  return true;
};

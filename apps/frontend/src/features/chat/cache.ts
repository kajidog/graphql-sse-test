import type { ApolloCache } from "@apollo/client";
import type { GetMessagesQuery } from "@/api/chat/graphql";
import { GetMessagesDocument } from "./graphql/chat.chat";

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

import { useApolloClient, useSubscription } from "@apollo/client";
import { OnMessageAddedDocument } from "../graphql/chat.chat";
import { appendMessageToCache } from "../cache";

export function useMessageSubscription(): void {
  const client = useApolloClient();

  useSubscription(OnMessageAddedDocument, {
    fetchPolicy: "no-cache",
    onData: ({ data: subscriptionData }) => {
      if (subscriptionData.error) {
        console.error("[SSE] Subscription GraphQL error:", subscriptionData.error);
        return;
      }

      const newMessage = subscriptionData.data?.messageAdded;
      if (!newMessage) {
        return;
      }

      // Apolloキャッシュを更新して新着メッセージを反映
      appendMessageToCache(client.cache, newMessage);
    },
    onError: (error) => {
      // サブスクエラーはUI側の通知に任せ、ここではログのみ
      console.error("[SSE] Subscription error:", error);
    },
  });
}

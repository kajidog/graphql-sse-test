import { useApolloClient } from "@apollo/client";
import { useOnMessageAddedSubscription } from "@/graphql/generated";
import { appendMessageToCache } from "../cache";

export function useMessageSubscription(): void {
  const client = useApolloClient();

  useOnMessageAddedSubscription({
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

import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  ApolloLink,
  Observable,
} from "@apollo/client";
import type { FetchResult, Operation, NextLink } from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";
import { print } from "graphql";
import { createClient } from "graphql-sse";

const GRAPHQL_ENDPOINT = "http://localhost:8080/graphql";

// 認証トークンの保持はメモリ上に限定する（リロード時はApp側で復元）
let currentUserId: string | null = null;

export const setCurrentUserId = (userId: string | null) => {
  currentUserId = userId;
};

export const getCurrentUserId = () => currentUserId;

const buildAuthHeader = (): Record<string, string> =>
  currentUserId ? { Authorization: `Bearer ${currentUserId}` } : {};

// HTTP Link（クエリ・ミューテーション用）
const httpLink = new HttpLink({
  uri: GRAPHQL_ENDPOINT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth Link
const authLink = new ApolloLink((operation, forward) => {
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      ...buildAuthHeader(),
    },
  }));
  return forward(operation);
});

// SSE Client for Subscriptions
const sseClient = createClient({
  url: GRAPHQL_ENDPOINT,
  headers: () => ({
    ...buildAuthHeader(),
  }),
});

// SSE Link for Subscriptions
class SSELink extends ApolloLink {
  public request(
    operation: Operation,
    _forward?: NextLink
  ): Observable<FetchResult> | null {
    return new Observable<FetchResult>((observer) => {
      const { query, variables, operationName } = operation;

      // graphql-sse に合わせてクエリ文字列へ変換
      const unsubscribe = sseClient.subscribe(
        {
          query: print(query),
          variables: variables as Record<string, unknown>,
          operationName: operationName ?? undefined,
        },
        {
          next: (data) => observer.next(data as FetchResult),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        }
      );

      return () => {
        unsubscribe();
      };
    });
  }
}

const sseLink = new SSELink();

// オペレーション種別でHTTPとSSEを切り替える
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  sseLink,
  authLink.concat(httpLink)
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

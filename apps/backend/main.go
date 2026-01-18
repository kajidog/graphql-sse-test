package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/kajidog/graphql-sse-test/apps/backend/graph"
	"github.com/kajidog/graphql-sse-test/apps/backend/middleware"
	"github.com/kajidog/graphql-sse-test/apps/backend/pubsub"
	"github.com/kajidog/graphql-sse-test/apps/backend/server"
	"github.com/kajidog/graphql-sse-test/apps/backend/store"
)

const defaultPort = "8080"

func main() {
	// 依存関係を初期化
	memoryStore := store.NewMemoryStore()
	memoryPubSub := pubsub.NewMemoryPubSub()

	// GraphQLリゾルバーとサーバーを初期化
	resolver := graph.NewResolver(memoryStore, memoryPubSub)
	srv := server.NewServer(graph.NewExecutableSchema(graph.Config{Resolvers: resolver}))

	// CORS + 認証ミドルウェアを適用
	handler := middleware.CORSMiddleware(middleware.AuthMiddleware(srv))

	http.Handle("/", playground.Handler("GraphQL playground", "/graphql"))
	http.Handle("/graphql", handler)

	// 起動ログ
	fmt.Printf("Server ready at http://localhost:%s/\n", defaultPort)
	fmt.Printf("GraphQL endpoint: http://localhost:%s/graphql\n", defaultPort)
	log.Fatal(http.ListenAndServe(":"+defaultPort, nil))
}

package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/kajidog/graphql-sse-test/apps/backend/graph"
	"github.com/kajidog/graphql-sse-test/apps/backend/server"
)

const defaultPort = "8080"

func main() {
	// GraphQLリゾルバーとサーバーを初期化
	resolver := graph.NewResolver()
	srv := server.NewServer(graph.NewExecutableSchema(graph.Config{Resolvers: resolver}))

	// 認証 + CORS をまとめて適用
	handler := server.CORSMiddleware(server.AuthMiddleware(srv))

	http.Handle("/", playground.Handler("GraphQL playground", "/graphql"))
	http.Handle("/graphql", handler)

	// 起動ログ
	fmt.Printf("🚀 Server ready at http://localhost:%s/\n", defaultPort)
	fmt.Printf("📡 GraphQL endpoint: http://localhost:%s/graphql\n", defaultPort)
	log.Fatal(http.ListenAndServe(":"+defaultPort, nil))
}

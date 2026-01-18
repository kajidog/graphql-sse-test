package server

import (
	"github.com/99designs/gqlgen/graphql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
)

// NewServer はGraphQLサーバーを作成
func NewServer(es graphql.ExecutableSchema) *handler.Server {
	srv := handler.New(es)

	// トランスポートを追加
	srv.AddTransport(SSETransport{})
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.POST{})

	// Introspection有効
	srv.Use(extension.Introspection{})

	return srv
}

package graph

import (
	"github.com/kajidog/graphql-sse-test/apps/backend/pubsub"
	"github.com/kajidog/graphql-sse-test/apps/backend/store"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	Store  store.Store
	PubSub pubsub.PubSub
}

func NewResolver(s store.Store, ps pubsub.PubSub) *Resolver {
	return &Resolver{
		Store:  s,
		PubSub: ps,
	}
}

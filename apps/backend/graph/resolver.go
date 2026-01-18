package graph

import (
	"github.com/kajidog/graphql-sse-test/apps/backend/service"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	UserService    service.UserService
	MessageService service.MessageService
}

func NewResolver(us service.UserService, ms service.MessageService) *Resolver {
	return &Resolver{
		UserService:    us,
		MessageService: ms,
	}
}

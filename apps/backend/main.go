package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/kajidog/graphql-sse-test/apps/backend/graph"
	"github.com/kajidog/graphql-sse-test/apps/backend/middleware"
	"github.com/kajidog/graphql-sse-test/apps/backend/pubsub"
	"github.com/kajidog/graphql-sse-test/apps/backend/server"
	"github.com/kajidog/graphql-sse-test/apps/backend/service"
	"github.com/kajidog/graphql-sse-test/apps/backend/store"
)

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, ok := os.LookupEnv(key); ok {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return fallback
}

func main() {
	port := getEnv("PORT", "8080")
	useRedis := getEnv("USE_REDIS", "false") == "true"

	var dataStore store.Store
	var messagePubSub pubsub.PubSub

	if useRedis {
		// Redis設定
		redisAddr := getEnv("REDIS_ADDR", "localhost:6379")
		redisPassword := getEnv("REDIS_PASSWORD", "")
		redisDB := getEnvInt("REDIS_DB", 0)

		// RedisStoreを初期化
		redisStore, err := store.NewRedisStore(redisAddr, redisPassword, redisDB)
		if err != nil {
			log.Fatalf("Failed to connect to Redis (store): %v", err)
		}
		dataStore = redisStore

		// RedisPubSubを初期化
		redisPubSub, err := pubsub.NewRedisPubSub(redisAddr, redisPassword, redisDB)
		if err != nil {
			log.Fatalf("Failed to connect to Redis (pubsub): %v", err)
		}
		messagePubSub = redisPubSub

		log.Printf("Using Redis backend: %s", redisAddr)
	} else {
		// インメモリ実装を使用
		dataStore = store.NewMemoryStore()
		messagePubSub = pubsub.NewMemoryPubSub()
		log.Println("Using in-memory backend")
	}

	// サービス層を初期化
	userService := service.NewUserService(dataStore)
	messageService := service.NewMessageService(dataStore, messagePubSub)

	// GraphQLリゾルバーとサーバーを初期化
	resolver := graph.NewResolver(userService, messageService)
	srv := server.NewServer(graph.NewExecutableSchema(graph.Config{Resolvers: resolver}))

	// CORS + 認証ミドルウェアを適用
	handler := middleware.CORSMiddleware(middleware.AuthMiddleware(srv))

	http.Handle("/", playground.Handler("GraphQL playground", "/graphql"))
	http.Handle("/graphql", handler)

	// 起動ログ
	fmt.Printf("Server ready at http://localhost:%s/\n", port)
	fmt.Printf("GraphQL endpoint: http://localhost:%s/graphql\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

package server

import (
	"context"
	"log"
	"time"

	"github.com/99designs/gqlgen/graphql"
)

// FieldLogger はリゾルバー単位で実行ログを出力する gqlgen フィールドインターセプタ
func FieldLogger(ctx context.Context, next graphql.Resolver) (interface{}, error) {
	fc := graphql.GetFieldContext(ctx)

	// 実際にリゾルバー関数を持つフィールドのみ対象（構造体ゲッターは除外しノイズを減らす）
	if fc == nil || !fc.IsResolver {
		return next(ctx)
	}

	start := time.Now()
	res, err := next(ctx)
	elapsed := time.Since(start)

	// fc.Object = 親の型名 (Query/Mutation/Subscription など), fc.Field.Name = リゾルバー名
	status := "ok"
	if err != nil {
		status = "error"
	}
	log.Printf("[RESOLVER] %s.%s took=%s status=%s",
		fc.Object, fc.Field.Name, elapsed, status)

	return res, err
}

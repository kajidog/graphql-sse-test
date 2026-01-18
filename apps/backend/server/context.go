package server

import "context"

// contextKey はコンテキストのキー衝突を避けるための専用型
type contextKey string

const userIDKey contextKey = "userID"

// WithUserID はユーザーIDをコンテキストへ埋め込む
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// UserIDFromContext はコンテキストからユーザーIDを取得する
func UserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(userIDKey).(string)
	if !ok || userID == "" {
		return "", false
	}
	return userID, true
}

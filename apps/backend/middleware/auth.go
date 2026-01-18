package middleware

import (
	"context"
	"net/http"
	"strings"
)

// 固定の認証トークン（本番ではCognitoトークンを使用）
const ValidToken = "sample-auth-token-12345"

// コンテキストキー
type contextKey string

const userIDKey contextKey = "userID"

// WithUserID はコンテキストにユーザーIDを追加
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// UserIDFromContext はコンテキストからユーザーIDを取得
func UserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(userIDKey).(string)
	return userID, ok
}

// AuthMiddleware はBearerトークンを検証し、ユーザーIDをコンテキストに追加
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")

		// Authorizationヘッダーがない場合
		if auth == "" {
			http.Error(w, `{"errors":[{"message":"Authorization header required"}]}`, http.StatusUnauthorized)
			return
		}

		// Bearer形式でない場合
		if !strings.HasPrefix(auth, "Bearer ") {
			http.Error(w, `{"errors":[{"message":"Invalid authorization format. Use: Bearer <token>"}]}`, http.StatusUnauthorized)
			return
		}

		token := strings.TrimPrefix(auth, "Bearer ")

		// トークンを検証
		if token != ValidToken {
			http.Error(w, `{"errors":[{"message":"Invalid token"}]}`, http.StatusUnauthorized)
			return
		}

		// 認証成功：X-User-IDヘッダーからユーザーIDを取得してコンテキストに追加
		userID := r.Header.Get("X-User-ID")
		if userID != "" {
			ctx := WithUserID(r.Context(), userID)
			r = r.WithContext(ctx)
		}

		next.ServeHTTP(w, r)
	})
}

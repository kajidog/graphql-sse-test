package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

// SSETransport はServer-Sent Eventsトランスポート
type SSETransport struct{}

func (t SSETransport) Supports(r *http.Request) bool {
	// Acceptが text/event-stream を含む場合のみSSEへ切り替える
	accept := strings.ToLower(r.Header.Get("Accept"))
	return strings.Contains(accept, "text/event-stream")
}

func (t SSETransport) Do(w http.ResponseWriter, r *http.Request, exec graphql.GraphExecutor) {
	// SSEとしてのレスポンスヘッダーを設定
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	// リクエストボディからGraphQLパラメータを取得
	params, err := readGraphQLParams(r)
	if err != nil {
		log.Printf("[SSE] Request parse error: %v", err)
		sendSSEError(w, flusher, err)
		return
	}

	// GraphQL操作の準備
	rc, err := exec.CreateOperationContext(r.Context(), &graphql.RawParams{
		Query:         params.Query,
		OperationName: params.OperationName,
		Variables:     params.Variables,
	})
	if err != nil {
		if gqlErrors, ok := err.(gqlerror.List); ok {
			// 空のリストは異常系だが、rcが作成されているなら継続する
			if len(gqlErrors) == 0 && rc != nil {
				log.Printf("[SSE] CreateOperationContext returned empty error list, continuing")
			} else {
				sendSSEGraphQLErrors(w, flusher, gqlErrors)
				return
			}
		} else {
			log.Printf("[SSE] CreateOperationContext error: %v", err)
			sendSSEError(w, flusher, err)
			return
		}
	}

	// Subscriptionの場合
	responses, ctx := exec.DispatchOperation(r.Context(), rc)
	log.Printf("[SSE] Subscription started")

	// responses(ctx) が次のイベントまでブロックする前提で待機
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		response := responses(ctx)
		if response == nil {
			return
		}

		// データもエラーも無いレスポンスは無視
		if response.Data == nil && len(response.Errors) == 0 {
			continue
		}

		data, err := json.Marshal(response)
		if err != nil {
			sendSSEError(w, flusher, err)
			return
		}

		// SSE形式で送信
		writeSSEEvent(w, flusher, "next", data)
	}
}

type graphQLParams struct {
	Query         string                 `json:"query"`
	OperationName string                 `json:"operationName"`
	Variables     map[string]interface{} `json:"variables"`
}

func readGraphQLParams(r *http.Request) (graphQLParams, error) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return graphQLParams{}, err
	}

	var params graphQLParams
	if err := json.Unmarshal(body, &params); err != nil {
		return graphQLParams{}, err
	}

	if strings.TrimSpace(params.Query) == "" {
		return graphQLParams{}, fmt.Errorf("empty GraphQL query")
	}

	return params, nil
}

func sendSSEError(w http.ResponseWriter, flusher http.Flusher, err error) {
	errData, _ := json.Marshal(map[string]interface{}{
		"errors": []map[string]interface{}{
			{"message": err.Error()},
		},
	})
	// graphql-sse expects errors to be sent as 'next' event, not 'error'
	writeSSEEvent(w, flusher, "next", errData)
}

func sendSSEGraphQLErrors(w http.ResponseWriter, flusher http.Flusher, errors gqlerror.List) {
	log.Printf("[SSE] GraphQL errors: %d", len(errors))
	for i, e := range errors {
		log.Printf("[SSE] Error[%d]: %s", i, e.Message)
		if e.Extensions != nil {
			log.Printf("[SSE] Error extensions[%d]: %v", i, e.Extensions)
		}
	}

	errList := make([]map[string]interface{}, len(errors))
	for i, e := range errors {
		errItem := map[string]interface{}{
			"message": e.Message,
		}
		if len(e.Locations) > 0 {
			errItem["locations"] = e.Locations
		}
		if e.Path != nil {
			errItem["path"] = e.Path
		}
		if e.Extensions != nil {
			errItem["extensions"] = e.Extensions
		}
		errList[i] = errItem
	}
	errData, _ := json.Marshal(map[string]interface{}{
		"errors": errList,
	})
	writeSSEEvent(w, flusher, "next", errData)
}

func writeSSEEvent(w http.ResponseWriter, flusher http.Flusher, event string, data []byte) {
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, data)
	flusher.Flush()
}

// NewServer はGraphQLサーバーを作成
func NewServer(es graphql.ExecutableSchema) *handler.Server {
	srv := handler.New(es)

	// SSEトランスポートを追加
	srv.AddTransport(SSETransport{})
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.POST{})

	// Introspection有効
	srv.Use(extension.Introspection{})

	return srv
}

// KeepAlive はSSE接続を維持するためのコメントを定期的に送信
func KeepAlive(w http.ResponseWriter, flusher http.Flusher, ctx context.Context) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			fmt.Fprintf(w, ": keep-alive\n\n")
			flusher.Flush()
		case <-ctx.Done():
			return
		}
	}
}

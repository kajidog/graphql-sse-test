package graph

import (
	"sync"

	"github.com/kajidog/graphql-sse-test/apps/backend/graph/model"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	// インメモリストレージ
	users    map[string]*model.User
	messages []*model.Message
	mu       sync.RWMutex

	// Subscription用のチャンネル管理
	subscribers map[string]chan *model.Message
	subMu       sync.Mutex
}

func NewResolver() *Resolver {
	// 起動時に空のインメモリストレージを用意
	return &Resolver{
		users:       make(map[string]*model.User),
		messages:    make([]*model.Message, 0),
		subscribers: make(map[string]chan *model.Message),
	}
}

// Subscribe はサブスクライバーを追加
func (r *Resolver) Subscribe(id string) chan *model.Message {
	r.subMu.Lock()
	defer r.subMu.Unlock()
	// バッファ1で短時間のバーストを吸収
	ch := make(chan *model.Message, 1)
	r.subscribers[id] = ch
	return ch
}

// Unsubscribe はサブスクライバーを削除
func (r *Resolver) Unsubscribe(id string) {
	r.subMu.Lock()
	defer r.subMu.Unlock()
	if ch, ok := r.subscribers[id]; ok {
		close(ch)
		delete(r.subscribers, id)
	}
}

// Broadcast はメッセージを全サブスクライバーに配信
func (r *Resolver) Broadcast(msg *model.Message) {
	r.subMu.Lock()
	defer r.subMu.Unlock()
	for _, ch := range r.subscribers {
		select {
		case ch <- msg:
		default:
			// チャンネルが詰まっている場合は詰まり回避を優先
		}
	}
}

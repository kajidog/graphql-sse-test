package pubsub

import (
	"sync"

	"github.com/kajidog/graphql-sse-test/apps/backend/graph/model"
)

// PubSub はメッセージのPub/Sub管理インターフェース
type PubSub interface {
	Subscribe(id string) chan *model.Message
	Unsubscribe(id string)
	Publish(msg *model.Message)
}

// MemoryPubSub はインメモリPub/Subの実装
type MemoryPubSub struct {
	subscribers map[string]chan *model.Message
	mu          sync.Mutex
}

// NewMemoryPubSub は新しいMemoryPubSubを作成
func NewMemoryPubSub() *MemoryPubSub {
	return &MemoryPubSub{
		subscribers: make(map[string]chan *model.Message),
	}
}

// Subscribe はサブスクライバーを追加
func (p *MemoryPubSub) Subscribe(id string) chan *model.Message {
	p.mu.Lock()
	defer p.mu.Unlock()
	ch := make(chan *model.Message, 1)
	p.subscribers[id] = ch
	return ch
}

// Unsubscribe はサブスクライバーを削除
func (p *MemoryPubSub) Unsubscribe(id string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if ch, ok := p.subscribers[id]; ok {
		close(ch)
		delete(p.subscribers, id)
	}
}

// Publish はメッセージを全サブスクライバーに配信
func (p *MemoryPubSub) Publish(msg *model.Message) {
	p.mu.Lock()
	defer p.mu.Unlock()
	for _, ch := range p.subscribers {
		select {
		case ch <- msg:
		default:
			// チャンネルが詰まっている場合はスキップ
		}
	}
}

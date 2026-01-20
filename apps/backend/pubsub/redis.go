package pubsub

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/kajidog/graphql-sse-test/apps/backend/graph/model"
	"github.com/redis/go-redis/v9"
)

const channelName = "chat:messages"

// RedisPubSub はRedisを使用したPub/Subの実装
type RedisPubSub struct {
	client      *redis.Client
	ctx         context.Context
	subscribers map[string]chan *model.Message
	mu          sync.Mutex
}

// NewRedisPubSub は新しいRedisPubSubを作成
func NewRedisPubSub(addr, password string, db int) (*RedisPubSub, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	ctx := context.Background()

	// 接続テスト
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	ps := &RedisPubSub{
		client:      client,
		ctx:         ctx,
		subscribers: make(map[string]chan *model.Message),
	}

	// Redisからのメッセージを受信するゴルーチンを起動
	go ps.receiveMessages()

	return ps, nil
}

// receiveMessages はRedisからのメッセージを受信してローカルの購読者に配信
func (p *RedisPubSub) receiveMessages() {
	pubsub := p.client.Subscribe(p.ctx, channelName)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for redisMsg := range ch {
		var msg model.Message
		if err := json.Unmarshal([]byte(redisMsg.Payload), &msg); err != nil {
			continue
		}

		// ローカルの全購読者に配信
		p.mu.Lock()
		for _, ch := range p.subscribers {
			select {
			case ch <- &msg:
			default:
				// チャンネルが詰まっている場合はスキップ
			}
		}
		p.mu.Unlock()
	}
}

// Subscribe はサブスクライバーを追加
func (p *RedisPubSub) Subscribe(id string) chan *model.Message {
	p.mu.Lock()
	defer p.mu.Unlock()
	ch := make(chan *model.Message, 10) // バッファを増やして信頼性向上
	p.subscribers[id] = ch
	return ch
}

// Unsubscribe はサブスクライバーを削除
func (p *RedisPubSub) Unsubscribe(id string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if ch, ok := p.subscribers[id]; ok {
		close(ch)
		delete(p.subscribers, id)
	}
}

// Publish はメッセージをRedis経由で全サーバーに配信
func (p *RedisPubSub) Publish(msg *model.Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	// Redisに発行（全サーバーインスタンスに配信される）
	p.client.Publish(p.ctx, channelName, data)
}

// Close はRedis接続を閉じる
func (p *RedisPubSub) Close() error {
	return p.client.Close()
}

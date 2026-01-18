package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kajidog/graphql-sse-test/apps/backend/graph/model"
	"github.com/kajidog/graphql-sse-test/apps/backend/pubsub"
	"github.com/kajidog/graphql-sse-test/apps/backend/store"
)

// MessageService はメッセージ関連のビジネスロジックを提供
type MessageService interface {
	SendMessage(userID, content string) (*model.Message, error)
	GetMessages() []*model.Message
	Subscribe(id string) chan *model.Message
	Unsubscribe(id string)
}

type messageService struct {
	store  store.Store
	pubsub pubsub.PubSub
}

// NewMessageService は新しいMessageServiceを作成
func NewMessageService(s store.Store, ps pubsub.PubSub) MessageService {
	return &messageService{
		store:  s,
		pubsub: ps,
	}
}

// SendMessage はメッセージを送信し、全サブスクライバーに配信
func (s *messageService) SendMessage(userID, content string) (*model.Message, error) {
	user, exists := s.store.GetUser(userID)
	if !exists {
		return nil, fmt.Errorf("user not found")
	}

	msg := &model.Message{
		ID:        uuid.New().String(),
		User:      user,
		Content:   content,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	s.store.SaveMessage(msg)
	s.pubsub.Publish(msg)

	return msg, nil
}

// GetMessages は全メッセージを取得
func (s *messageService) GetMessages() []*model.Message {
	return s.store.GetMessages()
}

// Subscribe はサブスクリプションを開始
func (s *messageService) Subscribe(id string) chan *model.Message {
	return s.pubsub.Subscribe(id)
}

// Unsubscribe はサブスクリプションを終了
func (s *messageService) Unsubscribe(id string) {
	s.pubsub.Unsubscribe(id)
}

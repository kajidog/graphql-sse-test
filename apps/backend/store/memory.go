package store

import (
	"sync"

	"github.com/kajidog/graphql-sse-test/apps/backend/graph/model"
)

// Store はデータストレージのインターフェース
type Store interface {
	GetUser(id string) (*model.User, bool)
	GetUserByNickname(nickname string) (*model.User, bool)
	SaveUser(user *model.User)
	GetMessages() []*model.Message
	SaveMessage(msg *model.Message)
}

// MemoryStore はインメモリストレージの実装
type MemoryStore struct {
	users    map[string]*model.User
	messages []*model.Message
	mu       sync.RWMutex
}

// NewMemoryStore は新しいMemoryStoreを作成
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		users:    make(map[string]*model.User),
		messages: make([]*model.Message, 0),
	}
}

// GetUser はIDでユーザーを取得
func (s *MemoryStore) GetUser(id string) (*model.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	user, ok := s.users[id]
	return user, ok
}

// GetUserByNickname はニックネームでユーザーを検索
func (s *MemoryStore) GetUserByNickname(nickname string) (*model.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, u := range s.users {
		if u.Nickname == nickname {
			return u, true
		}
	}
	return nil, false
}

// SaveUser はユーザーを保存
func (s *MemoryStore) SaveUser(user *model.User) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[user.ID] = user
}

// GetMessages は全メッセージを取得
func (s *MemoryStore) GetMessages() []*model.Message {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.messages
}

// SaveMessage はメッセージを保存
func (s *MemoryStore) SaveMessage(msg *model.Message) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.messages = append(s.messages, msg)
}

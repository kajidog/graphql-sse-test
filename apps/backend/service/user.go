package service

import (
	"github.com/google/uuid"
	"github.com/kajidog/graphql-sse-test/apps/backend/graph/model"
	"github.com/kajidog/graphql-sse-test/apps/backend/store"
)

// UserService はユーザー関連のビジネスロジックを提供
type UserService interface {
	Login(nickname string) (*model.User, error)
	GetUser(id string) (*model.User, bool)
}

type userService struct {
	store store.Store
}

// NewUserService は新しいUserServiceを作成
func NewUserService(s store.Store) UserService {
	return &userService{store: s}
}

// Login は既存ユーザーを検索、なければ新規作成
func (s *userService) Login(nickname string) (*model.User, error) {
	// 既存ユーザーを検索
	if user, ok := s.store.GetUserByNickname(nickname); ok {
		return user, nil
	}

	// 新規ユーザーを作成
	user := &model.User{
		ID:       uuid.New().String(),
		Nickname: nickname,
	}
	s.store.SaveUser(user)
	return user, nil
}

// GetUser はIDでユーザーを取得
func (s *userService) GetUser(id string) (*model.User, bool) {
	return s.store.GetUser(id)
}

package store

import (
	"context"
	"encoding/json"
	"time"

	"github.com/kajidog/graphql-sse-test/apps/backend/graph/model"
	"github.com/redis/go-redis/v9"
)

const (
	userKeyPrefix    = "user:"
	nicknameKey      = "nicknames"
	messagesKey      = "messages"
	messagesTTL      = 24 * time.Hour // メッセージは24時間保持
	maxMessages      = 1000           // 最大メッセージ数
)

// RedisStore はRedisを使用したストレージの実装
type RedisStore struct {
	client *redis.Client
	ctx    context.Context
}

// NewRedisStore は新しいRedisStoreを作成
func NewRedisStore(addr, password string, db int) (*RedisStore, error) {
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

	return &RedisStore{
		client: client,
		ctx:    ctx,
	}, nil
}

// GetUser はIDでユーザーを取得
func (s *RedisStore) GetUser(id string) (*model.User, bool) {
	data, err := s.client.Get(s.ctx, userKeyPrefix+id).Bytes()
	if err != nil {
		return nil, false
	}

	var user model.User
	if err := json.Unmarshal(data, &user); err != nil {
		return nil, false
	}

	return &user, true
}

// GetUserByNickname はニックネームでユーザーを検索
func (s *RedisStore) GetUserByNickname(nickname string) (*model.User, bool) {
	// ニックネーム → ユーザーIDのマッピングから検索
	userID, err := s.client.HGet(s.ctx, nicknameKey, nickname).Result()
	if err != nil {
		return nil, false
	}

	return s.GetUser(userID)
}

// SaveUser はユーザーを保存
func (s *RedisStore) SaveUser(user *model.User) {
	data, err := json.Marshal(user)
	if err != nil {
		return
	}

	// ユーザーデータを保存
	s.client.Set(s.ctx, userKeyPrefix+user.ID, data, 0)

	// ニックネーム → ユーザーIDのマッピングを保存
	s.client.HSet(s.ctx, nicknameKey, user.Nickname, user.ID)
}

// GetMessages は全メッセージを取得
func (s *RedisStore) GetMessages() []*model.Message {
	// ZRANGEで時系列順にメッセージを取得
	data, err := s.client.ZRange(s.ctx, messagesKey, 0, -1).Result()
	if err != nil {
		return nil
	}

	messages := make([]*model.Message, 0, len(data))
	for _, d := range data {
		var msg model.Message
		if err := json.Unmarshal([]byte(d), &msg); err == nil {
			messages = append(messages, &msg)
		}
	}

	return messages
}

// SaveMessage はメッセージを保存
func (s *RedisStore) SaveMessage(msg *model.Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	// タイムスタンプをスコアとしてソート済みセットに追加
	score := float64(time.Now().UnixNano())
	s.client.ZAdd(s.ctx, messagesKey, redis.Z{
		Score:  score,
		Member: data,
	})

	// 古いメッセージを削除（最新maxMessages件のみ保持）
	s.client.ZRemRangeByRank(s.ctx, messagesKey, 0, -maxMessages-1)

	// TTLを設定
	s.client.Expire(s.ctx, messagesKey, messagesTTL)
}

// Close はRedis接続を閉じる
func (s *RedisStore) Close() error {
	return s.client.Close()
}

# GraphQL SSE Sample

GraphQL over Server-Sent Events (SSE) を使用したリアルタイムチャットアプリケーションのサンプルです。

## 技術スタック

| Layer | Technology |
|-------|------------|
| Frontend | React + Apollo Client + graphql-sse |
| Backend | Go + gqlgen |
| Protocol | GraphQL over SSE |

## アーキテクチャ

```
apps/
├── backend/           # Go GraphQL Server
│   ├── server/        # HTTPサーバー・SSEトランスポート
│   ├── graph/         # GraphQL スキーマ・リゾルバー
│   ├── service/       # ビジネスロジック層
│   ├── store/         # データストレージ層
│   ├── pubsub/        # Pub/Sub層
│   └── middleware/    # 認証・CORS
└── frontend/          # React Client
    ├── src/lib/       # Apollo Client設定
    └── src/features/  # 機能別モジュール
```

### レイヤー構成

```mermaid
flowchart TB
    subgraph Presentation
        A[GraphQL Resolver]
    end

    subgraph Application
        B[UserService]
        C[MessageService]
    end

    subgraph Infrastructure
        D[Store]
        E[PubSub]
    end

    A --> B
    A --> C
    B --> D
    C --> D
    C --> E
```

| レイヤー | 責務 | 実装 |
|---------|------|------|
| Presentation | リクエスト/レスポンス変換 | graph/resolver |
| Application | ビジネスロジック | service/ |
| Infrastructure | 外部リソースアクセス | store/, pubsub/ |

## 処理の流れ

### Subscription（リアルタイム受信）

```mermaid
sequenceDiagram
    participant Client as Frontend<br/>(Apollo Client)
    participant SSE as SSE Link<br/>(graphql-sse)
    participant Server as Backend<br/>(gqlgen)
    participant PubSub as PubSub

    Client->>SSE: subscription { messageAdded }
    SSE->>Server: POST /graphql<br/>Accept: text/event-stream
    Server->>PubSub: Subscribe(id)
    PubSub-->>Server: channel

    loop SSE Connection
        Server-->>SSE: event: next<br/>data: {"data": {...}}
        SSE-->>Client: onData callback
    end

    Client->>SSE: unsubscribe
    SSE->>Server: Connection closed
    Server->>PubSub: Unsubscribe(id)
```

### メッセージ送信

```mermaid
sequenceDiagram
    participant Client as Frontend
    participant Server as Backend
    participant Store as Store
    participant PubSub as PubSub
    participant Subscribers as 他のクライアント

    Client->>Server: mutation { sendMessage }
    Server->>Store: SaveMessage(msg)
    Server->>PubSub: Publish(msg)
    PubSub-->>Subscribers: channel <- msg
    Server-->>Client: Message
    Subscribers-->>Subscribers: onData(msg)
```

### SSEトランスポート詳細

```mermaid
flowchart TB
    subgraph Frontend
        A[Apollo Client] --> B{Operation Type?}
        B -->|Query/Mutation| C[HTTP Link]
        B -->|Subscription| D[SSE Link]
    end

    subgraph Backend
        C --> E[POST Handler]
        D --> F[SSE Transport]
        F --> G{Accept Header?}
        G -->|text/event-stream| H[SSE Response]
        G -->|other| E
    end

    subgraph SSE Response
        H --> I[Content-Type: text/event-stream]
        I --> J[event: next\ndata: JSON]
    end
```

### データフロー

```mermaid
flowchart LR
    subgraph Client
        A[useMessageSubscription] --> B[Apollo Cache]
        B --> C[UI Update]
    end

    subgraph Server
        D[SSETransport] --> E[Resolver]
        E --> F[Store]
        E --> G[PubSub]
    end

    D <-->|SSE Stream| A
    G -->|Broadcast| D
```

## セットアップ

```bash
# 依存関係のインストール
pnpm install

# バックエンド起動
cd apps/backend && go run .

# フロントエンド起動（別ターミナル）
cd apps/frontend && pnpm dev
```

## GraphQL スキーマ

```graphql
type Query {
  messages: [Message!]!
  me: User
}

type Mutation {
  login(nickname: String!): User!
  sendMessage(content: String!): Message!
}

type Subscription {
  messageAdded: Message!
}
```

## SSE vs WebSocket

| 特徴 | SSE | WebSocket |
|------|-----|-----------|
| 通信方向 | サーバー → クライアント | 双方向 |
| プロトコル | HTTP | 独自プロトコル |
| 再接続 | 自動 | 手動実装が必要 |
| ファイアウォール | 通過しやすい | ブロックされる場合あり |
| 実装難易度 | 低 | 中〜高 |

GraphQL Subscriptionのような「サーバーからのプッシュ」ユースケースでは、SSEがシンプルで実用的な選択肢です。

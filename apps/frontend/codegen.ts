import type { CodegenConfig } from "@graphql-codegen/cli";

// バックエンドごとに1プロジェクト（schema + documents + 出力先）を定義する。
// operation は feature 配下に co-locate し、`*.<backend>.graphql` のサフィックスで
// どのバックエンド宛かを明示する。2個目以降のバックエンドは generates にブロックを
// 足すだけで増やせる。
const config: CodegenConfig = {
  overwrite: true,
  generates: {
    // chat バックエンド
    "src/api/chat/generated.ts": {
      schema: "../backend/graph/schema.graphqls",
      documents: "src/**/*.chat.graphql",
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
      },
    },
    // 例: 2個目のバックエンドが増えたらこのように追加する
    // "src/api/billing/generated.ts": {
    //   schema: "https://billing.example.com/graphql",
    //   documents: "src/**/*.billing.graphql",
    //   plugins: [
    //     "typescript",
    //     "typescript-operations",
    //     "typescript-react-apollo",
    //   ],
    //   config: { withHooks: true, withHOC: false, withComponent: false },
    // },
  },
};

export default config;

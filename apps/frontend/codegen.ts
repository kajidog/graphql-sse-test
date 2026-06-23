import type { CodegenConfig } from "@graphql-codegen/cli";

// バックエンドごとに1プロジェクト（schema + documents + 出力先）を定義する。
// client preset を使い、出力フォルダごとに専用の `graphql()` 関数（TypedDocumentNode
// ファクトリ）と型をまとめて生成する。operation は feature 配下に co-locate し、
// `*.<backend>.ts` のサフィックスでどのバックエンド宛かを明示する。2個目以降の
// バックエンドは generates にブロックを足すだけで増やせる。
//
// client preset は1スキーマ＝1出力フォルダで完結するため、enum / type / input の
// 名前空間がバックエンドをまたいで衝突することはない。共通のヘルパー型も各フォルダの
// `graphql.ts` に集約されるため、旧 react-apollo 構成のような重複生成も起きない。
const config: CodegenConfig = {
  overwrite: true,
  generates: {
    // chat バックエンド
    "src/api/chat/": {
      schema: "../backend/graph/schema.graphqls",
      documents: "src/**/*.chat.ts",
      preset: "client",
      presetConfig: {
        // fragment を使っていないのでマスキングは無効化し、型を素直に扱えるようにする
        fragmentMasking: false,
      },
      config: {
        // tsconfig が verbatimModuleSyntax を有効にしているため type import を明示する
        useTypeImports: true,
      },
    },
    // 例: 2個目のバックエンドが増えたらこのように追加する
    // "src/api/billing/": {
    //   schema: "https://billing.example.com/graphql",
    //   documents: "src/**/*.billing.ts",
    //   preset: "client",
    //   presetConfig: { fragmentMasking: false },
    //   config: { useTypeImports: true },
    // },
  },
};

export default config;

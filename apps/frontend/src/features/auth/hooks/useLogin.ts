import { useCallback } from "react";
import { useLoginMutation } from "@/graphql/generated";
import type { AuthUser, UseLoginOptions, UseLoginReturn } from "../types";

export function useLogin(options?: UseLoginOptions): UseLoginReturn {
  const [loginMutation, { loading, error }] = useLoginMutation();

  const login = useCallback(
    async (nickname: string): Promise<AuthUser> => {
      // ニックネームでログインミューテーションを実行
      const result = await loginMutation({
        variables: { nickname },
      });

      // GraphQLエラーを明示的に扱う
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }

      // 期待したデータが無い場合はアプリ側で扱いやすいエラーに変換
      if (!result.data?.login) {
        throw new Error("ログインに失敗しました");
      }

      const user: AuthUser = {
        id: result.data.login.id,
        nickname: result.data.login.nickname,
      };

      // 呼び出し元の追加処理があれば実行
      options?.onSuccess?.(user);
      return user;
    },
    [loginMutation, options]
  );

  return {
    login,
    loading,
    error: error ? new Error(error.message) : null,
  };
}

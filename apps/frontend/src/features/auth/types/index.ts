export type { User } from "@/graphql/generated";

export interface AuthUser {
  id: string;
  nickname: string;
}

export interface LoginResult {
  user: AuthUser;
}

export interface UseLoginOptions {
  onSuccess?: (user: AuthUser) => void;
  onError?: (error: Error) => void;
}

export interface UseLoginReturn {
  login: (nickname: string) => Promise<AuthUser>;
  loading: boolean;
  error: Error | null;
}

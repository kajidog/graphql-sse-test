export type { Message, User } from "@/graphql/generated";

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    nickname: string;
  };
}

export interface UseMessagesReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseSendMessageOptions {
  onSuccess?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export interface UseSendMessageReturn {
  sendMessage: (content: string) => Promise<ChatMessage>;
  loading: boolean;
  error: Error | null;
}

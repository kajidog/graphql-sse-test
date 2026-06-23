import { graphql } from "@/api/chat";

export const GetMessagesDocument = graphql(`
  query GetMessages {
    messages {
      id
      user {
        id
        nickname
      }
      content
      createdAt
    }
  }
`);

export const SendMessageDocument = graphql(`
  mutation SendMessage($content: String!) {
    sendMessage(content: $content) {
      id
      user {
        id
        nickname
      }
      content
      createdAt
    }
  }
`);

export const OnMessageAddedDocument = graphql(`
  subscription OnMessageAdded {
    messageAdded {
      id
      user {
        id
        nickname
      }
      content
      createdAt
    }
  }
`);

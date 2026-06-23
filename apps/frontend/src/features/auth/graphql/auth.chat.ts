import { graphql } from "@/api/chat";

export const GetMeDocument = graphql(`
  query GetMe {
    me {
      id
      nickname
    }
  }
`);

export const LoginDocument = graphql(`
  mutation Login($nickname: String!) {
    login(nickname: $nickname) {
      id
      nickname
    }
  }
`);

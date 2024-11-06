export const types = `#graphql
    input CreateTweetData {
        content: String!
        imageURL: String
    }

    scalar Date
    type Tweet {
        id: ID!
        content: String!
        imageURL: String
        createdAt: Date

        author: User
    }
`;
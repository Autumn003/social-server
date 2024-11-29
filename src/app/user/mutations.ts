export const mutations = `#graphql
    followUser(to: String!): Boolean!
    unfollowUser(to: String!): Boolean!

    createBookmark(tweetId: String!): Bookmark!
    deleteBookmark(tweetId: String!): Boolean! 
`;

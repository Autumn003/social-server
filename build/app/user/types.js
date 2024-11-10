"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.types = void 0;
exports.types = `#graphql
    scalar Date
    type User {
        id: ID!
        firstName: String!
        lastName: String
        email: String!
        profileImageURL: String
        createdAt: Date

        followers: [User]
        followings: [User]

        recommendations: [User]

        tweets: [Tweet]
    }
`;

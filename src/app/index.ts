import express from "express";
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from "body-parser";
import { prismaClient } from "../clients/db";
import cors from "cors";

import { User } from "./user";
import { Tweet } from "./tweet";

import { graphqlContext } from "../interfaces";
import JWTService from "../services/jwt";

export const initServer = async() => {
    const app = express();
    app.use(bodyParser.json());
    app.use(cors());

    const graphqlServer = new ApolloServer<graphqlContext>({
        typeDefs:`
            ${User.types}
            ${Tweet.types}

            type Query {
                ${User.queries}
                ${Tweet.queries}
            }

            type Mutation {
                ${Tweet.mutations}
            }
        `,
        resolvers: {
            Query: {
                ...User.resolvers.queries,
                ...Tweet.resolvers.queries
            },
            Mutation: {
                ...Tweet.resolvers.mutations
            },
            ...Tweet.resolvers.extraResolvers,
            ...User.resolvers.extraResolvers
        },
    });

    await graphqlServer.start();
    
    app.use("/graphql", expressMiddleware(graphqlServer, {
        context: async ({req, res}) => {
            return {
                user: req.headers.authorization ? JWTService.decodeToken(req.headers.authorization.split('Bearer ')[1]) : undefined
            }
        }
    }));

    return app;
}
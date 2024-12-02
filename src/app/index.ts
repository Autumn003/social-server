import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import bodyParser from "body-parser";
import { createSignalingServer } from "./signalingServer";
import cors from "cors";
import http from "http";

import { User } from "./user";
import { Tweet } from "./tweet";

import { graphqlContext } from "../interfaces";
import JWTService from "../services/jwt";

export const initServer = async () => {
    const app = express();
    const server = http.createServer(app);

    app.use(bodyParser.json());
    app.use(cors());

    app.get("/", (req, res) => res.status(200).json({ message: "Server is healthy" }));

    const graphqlServer = new ApolloServer<graphqlContext>({
        typeDefs: `
            ${User.types}
            ${Tweet.types}

            type Query {
                ${User.queries}
                ${Tweet.queries}
            }

            type Mutation {
                ${Tweet.mutations}
                ${User.mutations}
            }
        `,
        resolvers: {
            Query: {
                ...User.resolvers.queries,
                ...Tweet.resolvers.queries,
            },
            Mutation: {
                ...Tweet.resolvers.mutations,
                ...User.resolvers.mutations,
            },
            ...Tweet.resolvers.extraResolvers,
            ...User.resolvers.extraResolvers,
        },
    });

    await graphqlServer.start();

    app.use(
        "/graphql",
        expressMiddleware(graphqlServer, {
            context: async ({ req, res }) => ({
                user: req.headers.authorization
                    ? JWTService.decodeToken(req.headers.authorization.split("Bearer ")[1])
                    : undefined,
            }),
        })
    );

    // Attach WebSocket signaling server
    createSignalingServer(server);

    return server;
};

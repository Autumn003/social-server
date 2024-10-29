import express from "express";
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from "body-parser";
import { prismaClient } from "../clients/db";

export const initServer = async() => {
    const app = express();
    app.use(bodyParser.json());

    const graphqlServer = new ApolloServer({
        typeDefs:`
            type Query {
                sayHello : String
                greet(name: String!): String!
            }
        `,
        resolvers: {
            Query: {
                sayHello: () =>`Hello from graphQl`,
                greet: (parent: any, {name}:{name:string}) => `Hello mr. ${name}, how are you?`
                
            }
        },
    });

    await graphqlServer.start();
    
    app.use("/graphql", expressMiddleware(graphqlServer));

    return app;
}
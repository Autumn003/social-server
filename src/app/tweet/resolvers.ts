import { Tweet } from "@prisma/client";
import { prismaClient } from "../../clients/db";
import { graphqlContext } from "../../interfaces";

export interface CreateTweetPayload {
    content: string;
    imageURL?: string;
  }

const queries = {
  getAllTweets : async() => await prismaClient.tweet.findMany({orderBy: {createdAt: "desc"}})
}

const mutations = {
  createTweet: async (parent: any, { payload }: { payload: CreateTweetPayload }, ctx: graphqlContext) => {
      if (!ctx.user) throw new Error("You are not authenticated");
      
      const tweet = await prismaClient.tweet.create({
        data: {
          content: payload.content,
          imageURL: payload.imageURL,
          author: {connect: {id: ctx.user.id}},
        }
      });
      return tweet;
    },
  };

  const extraResolvers = {
    Tweet : {
      author: async (parent: Tweet) =>
        await prismaClient.user.findUnique({where: {id: parent.authorId}})
    }
  }


export const resolvers = { mutations, extraResolvers, queries };
import { Tweet } from "@prisma/client";
import { prismaClient } from "../../clients/db";
import { graphqlContext } from "../../interfaces";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export interface CreateTweetPayload {
    content: string;
    imageURL?: string;
  }

const s3Client = new S3Client({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_S3_ACCESS_KEY_SECRET || "",
  }
})

const queries = {
  getAllTweets : async() => await prismaClient.tweet.findMany({orderBy: {createdAt: "desc"}}),

  getSignedURLForTweet: async(parent: any, {imageName, imageType}: {imageName: string, imageType: string}, ctx: graphqlContext) => {
    if(!ctx.user || !ctx.user.id) throw new Error("Unauthenticated");
    
    const allowedImageTypes = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
    if(!allowedImageTypes.includes(imageType)) throw new Error("Invalid image type");

    const putObjectCommand  = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: `uploads/${ctx.user.id}/tweets/${imageName}-${Date.now()}.${imageType}`,
    });

    const signedURL = await getSignedUrl(s3Client, putObjectCommand);
    return signedURL;
  }
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
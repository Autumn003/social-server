import { Tweet } from "@prisma/client";
import { graphqlContext } from "../../interfaces";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import UserService from "../../services/user";
import tweetService, { CreateTweetPayload } from "../../services/tweet";



const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  // no need to pass the credentials, because we set the env variables name as it automaticaly get
})

const queries = {
  getAllTweets : () => tweetService.getAllTweets(),


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
      
      const tweet = await tweetService.createTweet({
        ...payload,
        userId: ctx.user.id,
      })
      return tweet;
    },
  };

  const extraResolvers = {
    Tweet : {
      author: async (parent: Tweet) =>
        await UserService.getUserById(parent.authorId),

    }
  }


export const resolvers = { mutations, extraResolvers, queries };
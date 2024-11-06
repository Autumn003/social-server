import { prismaClient } from "../clients/db";


export interface CreateTweetPayload {
    content: string;
    imageURL?: string;
    userId: string
}

class tweetService {
    public static async getAllTweets(){
        return await prismaClient.tweet.findMany({orderBy: {createdAt: "desc"}})
    }

    public static async createTweet(data: CreateTweetPayload){
        return await prismaClient.tweet.create({
            data: {
                content: data.content,
                imageURL: data.imageURL,
                author:{ connect: {id: data.userId}}
            }
        })
    }
}

export default tweetService;
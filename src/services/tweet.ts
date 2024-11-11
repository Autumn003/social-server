import { prismaClient } from "../clients/db";
import { redisClient } from "../clients/redis";


export interface CreateTweetPayload {
    content: string;
    imageURL?: string;
    userId: string
}

class tweetService {
    public static async getAllTweets(){
        const cachedTweets = await redisClient.get("ALL_TWEETS");
        if (cachedTweets) {
            return JSON.parse(cachedTweets);
        }

        const tweets = await prismaClient.tweet.findMany({orderBy: {createdAt: "desc"}});
        await redisClient.set("ALL_TWEETS", JSON.stringify(tweets));
        return tweets;
    }

    public static async createTweet(data: CreateTweetPayload){
        const tweet = await prismaClient.tweet.create({
            data: {
                content: data.content,
                imageURL: data.imageURL,
                author:{ connect: {id: data.userId}}
            }
        });
        await redisClient.del("ALL_TWEETS");
        return tweet;
    }
}

export default tweetService;
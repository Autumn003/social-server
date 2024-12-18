import axios from "axios";
import { prismaClient } from "../clients/db";
import JWTService from "./jwt";
import { redisClient } from "../clients/redis";

interface googleTokenResult {
    iss?: string,
    azp?: string,
    aud?: string,
    sub?: string,
    email: string,
    email_verified: string,
    nbf?: string,
    name?: string,
    picture?: string,
    given_name?: string,
    family_name?: string,
    iat?: string,
    exp?: string,
    jti?: string,
    alg?: string,
    kid?: string,
    typ?: string,
}

class UserService {
    public static async verifyGoogleAuthToken(token: string){
        const googleToken = token;
        const googleOAuthURL = new URL("https://oauth2.googleapis.com/tokeninfo");
        googleOAuthURL.searchParams.set("id_token", googleToken);

        const {data} = await axios.get<googleTokenResult>(googleOAuthURL.toString(), {
            responseType: "json",
        });

        const user = await prismaClient.user.findUnique({
            where: {email: data.email}
        });

        if(!user){
            const newUser = await prismaClient.user.create({
                data: {
                    email: data.email,
                    firstName: data.given_name || "",
                    lastName: data.family_name || "",
                    profileImageURL: data.picture
                }
            })
        }

        const userInDB = await prismaClient.user.findUnique({
            where: {email: data.email}
        });

        if(!userInDB){
            throw new Error("User with email not found!");
        }

        const userToken = await JWTService.generateTokenForUser(userInDB);

        return userToken;

    }

    public static async getUserById(id: string){
        const cachedUser = await redisClient.get(`USER:${id}`);
        if(cachedUser){
            return JSON.parse(cachedUser);
        }

        const user = await prismaClient.user.findUnique({ where:{ id } });
        if(user){
            await redisClient.set(`USER:${id}`, JSON.stringify(user));
        }
        return user;
    }

    public static async followUser(from: string, to: string){
        const follow = await prismaClient.follows.create({
            data: {
                follower: { connect: { id: from }},
                following: { connect: { id: to }}
            }
        });
        await redisClient.del(`USER:${from}`);
        await redisClient.del(`USER:${to}`);
        return follow;
    }

    public static async unfollowUser(from: string, to: string){
        const unfollow = await prismaClient.follows.delete({
            where: {
                followerId_followingId: {followerId: from, followingId: to}
            }
        });
        await redisClient.del(`USER:${from}`);
        await redisClient.del(`USER:${to}`);
        return unfollow;
    }

    public static async createBookmark(userId: string, tweetId: string) {
        const bookmark = await prismaClient.bookmark.create({
            data: {
                userId,
                tweetId,
            },
            include: {tweet: true, user: true}
        });
        return {
            ...bookmark,
            id: `${bookmark.userId}_${bookmark.tweetId}`
        };
    }

    public static async deleteBookmark(userId: string, tweetId: string) {
        const deletedBookmark = await prismaClient.bookmark.delete({
            where: {
                userId_tweetId: { userId, tweetId },
            },
        });
        return deletedBookmark;
    }

    public static async getBookmarks(userId: string) {
        const bookmarks = await prismaClient.bookmark.findMany({
            where: { userId },
            include: { tweet: true },
            orderBy: { createdAt: "desc"}
        });
        return bookmarks.map((bookmark) => bookmark.tweet);
    }

}

export default UserService;
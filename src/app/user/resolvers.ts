import { prismaClient } from "../../clients/db";
import { graphqlContext } from "../../interfaces";
import { User } from "@prisma/client";
import UserService from "../../services/user";
import { redisClient } from "../../clients/redis";


const queries = {
    verifyGoogleToken: async(parent: any, {token}:{token:string}) => {
        const resToken = UserService.verifyGoogleAuthToken(token);
        return resToken;
    },

    getCurrentUser: async (parent: any, args: any, ctx: graphqlContext) => {
        const id = ctx.user?.id;
        if (!id) return null;
    
        const user = UserService.getUserById(id);
        return user;
    },

    getUserById: async (parent: any, {id}:{id:string}, ctx: graphqlContext) =>
        UserService.getUserById(id),

    getUserBookmarks: async (parent: any, args: any, ctx: graphqlContext) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Unauthenticated!");
      return UserService.getBookmarks(userId);
    },
}

const mutations = {
    followUser: async(parent: any, {to}: {to: string}, ctx: graphqlContext) => {
        const from = ctx.user?.id;
        if (!from) throw new Error("Unauthenticated!");

        await UserService.followUser(from, to);
        await redisClient.del(`RECOMMENDED_USER:${ctx.user?.id}`);
        return true;
    },

    unfollowUser: async(parent: any, {to}: {to: string}, ctx: graphqlContext) => {
        const from = ctx.user?.id;
        if (!from) throw new Error("Unauthenticated!");

        await UserService.unfollowUser(from, to);
        await redisClient.del(`RECOMMENDED_USER:${ctx.user?.id}`);
        return true;
    },

    createBookmark: async (parent: any, { tweetId }: { tweetId: string }, ctx: graphqlContext) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Unauthenticated!");
      return UserService.createBookmark(userId, tweetId);
    },

    deleteBookmark: async (parent: any, { tweetId }: { tweetId: string }, ctx: graphqlContext) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Unauthenticated!");
      await UserService.deleteBookmark(userId, tweetId);
      return true;
    },

}

const extraResolvers = {
    User: {
        tweets: async (parent: User) => 
            await prismaClient.tweet.findMany({where: {author: {id: parent.id}}}),

        followers: async (parent: User) => {
            const res = await prismaClient.follows.findMany({
                where: { following: {id: parent.id} },
                include: {
                    follower: true,
                },
            });
            return res.map((follow) => follow.follower);
        },

        followings: async (parent: User) => {
            const res = await prismaClient.follows.findMany({
                where: { follower: {id: parent.id} },
                include: {
                    following: true,
                },
            });
            return res.map((follow) => follow.following);
        },

        recommendations: async (parent: User, arg:any, ctx: graphqlContext) => {
            if(!ctx.user) return [];

            const cachedRecommendation = await redisClient.get(`RECOMMENDED_USER:${ctx.user.id}`);
            if(cachedRecommendation) return JSON.parse(cachedRecommendation);

            const myFollowings = await prismaClient.follows.findMany({
                where: {
                  follower: { id: ctx.user.id },
                },
                include: {
                  following: {
                    include: { followers: { include: { following: true } } },
                  },
                },
              });

            const users: User[] = [];
            
            for (const followings of myFollowings) {
                for (const followingOfMyFollowedUser of followings.following.followers) {
                  if (
                    followingOfMyFollowedUser.following.id !== ctx.user.id &&
                    myFollowings.findIndex(
                      (e) => e?.followingId === followingOfMyFollowedUser.following.id
                    ) < 0
                  ) {
                    users.push(followingOfMyFollowedUser.following);
                  }
                }
              }

              await redisClient.set(
                `RECOMMENDED_USER:${ctx.user.id}`, JSON.stringify(users)
              );

            return users
        },

        bookmarks: async (parent: User) =>
          await prismaClient.bookmark.findMany({
              where: { userId: parent.id },
              include: { tweet: true },
          }).then((bookmarks) => bookmarks.map((b) => b.tweet)),

    }
}


export const resolvers = { queries, mutations, extraResolvers };
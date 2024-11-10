import { prismaClient } from "../../clients/db";
import { graphqlContext } from "../../interfaces";
import { User } from "@prisma/client";
import UserService from "../../services/user";


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
        UserService.getUserById(id)
}

const mutations = {
    followUser: async(parent: any, {to}: {to: string}, ctx: graphqlContext) => {
        const from = ctx.user?.id;
        if (!from) throw new Error("Unauthenticated!");

        await UserService.followUser(from, to);
        return true;
    },

    unfollowUser: async(parent: any, {to}: {to: string}, ctx: graphqlContext) => {
        const from = ctx.user?.id;
        if (!from) throw new Error("Unauthenticated!");

        await UserService.unfollowUser(from, to);
        return true;
    }
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

            const myyFollowings = await prismaClient.follows.findMany({
                where: { follower: 
                    { id: ctx.user.id }
                },
                include: {
                    following: {
                        include: {followers: {include: {following: true}}}
                    }
                }
            });

            const users: User[] = [];

            for(const followings of myyFollowings) {
                for(const followingOfMyFollowedUser of followings.following.followers){
                    if(
                        followingOfMyFollowedUser.following.id !== ctx.user.id &&
                        myyFollowings.findIndex(
                            (e) => e?.followerId === followingOfMyFollowedUser.following.id
                        ) < 0
                    ) {
                        users.push(followingOfMyFollowedUser.following);
                    }
                }
            }
            return users
        }
    }
}


export const resolvers = { queries, mutations, extraResolvers };
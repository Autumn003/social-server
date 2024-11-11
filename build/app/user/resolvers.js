"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const db_1 = require("../../clients/db");
const user_1 = __importDefault(require("../../services/user"));
const redis_1 = require("../../clients/redis");
const queries = {
    verifyGoogleToken: (parent_1, _a) => __awaiter(void 0, [parent_1, _a], void 0, function* (parent, { token }) {
        const resToken = user_1.default.verifyGoogleAuthToken(token);
        return resToken;
    }),
    getCurrentUser: (parent, args, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const id = (_a = ctx.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!id)
            return null;
        const user = user_1.default.getUserById(id);
        return user;
    }),
    getUserById: (parent_1, _a, ctx_1) => __awaiter(void 0, [parent_1, _a, ctx_1], void 0, function* (parent, { id }, ctx) { return user_1.default.getUserById(id); })
};
const mutations = {
    followUser: (parent_1, _a, ctx_1) => __awaiter(void 0, [parent_1, _a, ctx_1], void 0, function* (parent, { to }, ctx) {
        var _b, _c;
        const from = (_b = ctx.user) === null || _b === void 0 ? void 0 : _b.id;
        if (!from)
            throw new Error("Unauthenticated!");
        yield user_1.default.followUser(from, to);
        yield redis_1.redisClient.del(`RECOMMENDED_USER:${(_c = ctx.user) === null || _c === void 0 ? void 0 : _c.id}`);
        return true;
    }),
    unfollowUser: (parent_1, _a, ctx_1) => __awaiter(void 0, [parent_1, _a, ctx_1], void 0, function* (parent, { to }, ctx) {
        var _b, _c;
        const from = (_b = ctx.user) === null || _b === void 0 ? void 0 : _b.id;
        if (!from)
            throw new Error("Unauthenticated!");
        yield user_1.default.unfollowUser(from, to);
        yield redis_1.redisClient.del(`RECOMMENDED_USER:${(_c = ctx.user) === null || _c === void 0 ? void 0 : _c.id}`);
        return true;
    })
};
const extraResolvers = {
    User: {
        tweets: (parent) => __awaiter(void 0, void 0, void 0, function* () { return yield db_1.prismaClient.tweet.findMany({ where: { author: { id: parent.id } } }); }),
        followers: (parent) => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield db_1.prismaClient.follows.findMany({
                where: { following: { id: parent.id } },
                include: {
                    follower: true,
                },
            });
            return res.map((follow) => follow.follower);
        }),
        followings: (parent) => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield db_1.prismaClient.follows.findMany({
                where: { follower: { id: parent.id } },
                include: {
                    following: true,
                },
            });
            return res.map((follow) => follow.following);
        }),
        recommendations: (parent, arg, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            if (!ctx.user)
                return [];
            const cachedRecommendation = yield redis_1.redisClient.get(`RECOMMENDED_USER:${ctx.user.id}`);
            if (cachedRecommendation)
                return JSON.parse(cachedRecommendation);
            const myFollowings = yield db_1.prismaClient.follows.findMany({
                where: {
                    follower: { id: ctx.user.id },
                },
                include: {
                    following: {
                        include: { followers: { include: { following: true } } },
                    },
                },
            });
            const users = [];
            for (const followings of myFollowings) {
                for (const followingOfMyFollowedUser of followings.following.followers) {
                    if (followingOfMyFollowedUser.following.id !== ctx.user.id &&
                        myFollowings.findIndex((e) => (e === null || e === void 0 ? void 0 : e.followingId) === followingOfMyFollowedUser.following.id) < 0) {
                        users.push(followingOfMyFollowedUser.following);
                    }
                }
            }
            yield redis_1.redisClient.set(`RECOMMENDED_USER:${ctx.user.id}`, JSON.stringify(users));
            return users;
        })
    }
};
exports.resolvers = { queries, mutations, extraResolvers };

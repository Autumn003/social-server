import axios from "axios";
import { prismaClient } from "../clients/db";
import JWTService from "./jwt";

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
        return await prismaClient.user.findUnique({ where:{ id } });
    }
}

export default UserService;
import { User } from "@prisma/client";
import JWT from "jsonwebtoken";
import { JWTUser } from "../interfaces";

const JWTSeret = process.env.JWT_SECRET || "";

class JWTService {
    public static async generateTokenForUser (user: User) {
        const payload: JWTUser = {
            id: user?.id,
            email: user?.email,
        };

        const token = JWT.sign(payload, JWTSeret);
        return token;
    }

    public static decodeToken(token: string) {
        try {
          return JWT.verify(token, JWTSeret) as JWTUser;
        } catch (error) {
          return null;
        }
      }
}

export default JWTService;
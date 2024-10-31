import { User } from "@prisma/client";
import JWT from "jsonwebtoken";

const JWTSeret = process.env.JWT_SECRET || "";

class JWTService {
    public static async generateTokenForUser (user: User): Promise<string> {
        const payload = {
            id: user?.id,
            email: user?.email,
        };

        const token = JWT.sign(payload, JWTSeret);
        return token;
    }
}

export default JWTService;
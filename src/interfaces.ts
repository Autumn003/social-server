export interface JWTUser {
    id: string;
    email: string;
}

export interface graphqlContext {
    user?: JWTUser;
}
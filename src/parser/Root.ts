import type Token from "../nodes/Token";

export default interface Root {
    getNextToken(token: Token, direction: -1 | 1): Token | undefined;
}
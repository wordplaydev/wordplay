import { tokenize } from './Tokenizer';
import Tokens from './Tokens';

export function toTokens(code: string): Tokens {
    const tokens = tokenize(code);
    return new Tokens(tokens.getTokens(), tokens.getSpaces());
}

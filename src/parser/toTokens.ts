import { tokenize } from '@parser/Tokenizer';
import Tokens from '@parser/Tokens';

export function toTokens(code: string): Tokens {
    const tokens = tokenize(code);
    return new Tokens(tokens.getTokens(), tokens.getSpaces());
}

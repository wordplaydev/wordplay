import type { KeywordIndex } from '#parser/Keywords.ts';
import { tokenize } from '#parser/Tokenizer.ts';
import Tokens from '#parser/Tokens.ts';

/**
 * Tokenize source into a {@link Tokens} stream. Pass a {@link KeywordIndex} (built from the program's
 * locales) to recognize localized keyword words as their canonical Sym; omit it for symbol-only
 * tokenization (the default and today's behavior). See LANGUAGE.md.
 */
export function toTokens(code: string, keywords?: KeywordIndex): Tokens {
    const tokens = tokenize(code, keywords);
    return new Tokens(tokens.getTokens(), tokens.getSpaces());
}

import type FunctionDefinition from '#nodes/FunctionDefinition.ts';
import { parseFunction } from '#parser/parseExpression.ts';
import { toTokens } from '#parser/toTokens.ts';

export default function toFunction(wordplay: string): FunctionDefinition {
    return parseFunction(toTokens(wordplay));
}

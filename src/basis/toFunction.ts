import type FunctionDefinition from '@nodes/FunctionDefinition';
import { parseFunction } from '../parser/parseExpression';
import { toTokens } from '../parser/toTokens';

export default function toFunction(wordplay: string): FunctionDefinition {
    return parseFunction(toTokens(wordplay));
}

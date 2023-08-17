import type FunctionDefinition from '@nodes/FunctionDefinition';
import { toTokens } from '../parser/toTokens';
import { parseFunction } from '../parser/parseExpression';

export default function toFunction(wordplay: string): FunctionDefinition {
    return parseFunction(toTokens(wordplay));
}

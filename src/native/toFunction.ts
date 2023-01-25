import type FunctionDefinition from '@nodes/FunctionDefinition';
import { parseFunction, toTokens } from '../parser/Parser';

export default function toFunction(wordplay: string): FunctionDefinition {
    return parseFunction(toTokens(wordplay));
}

import type StructureDefinition from '@nodes/StructureDefinition';
import { toTokens } from '../parser/toTokens';
import { parseStructure } from '../parser/parseExpression';

export default function toStructure(wordplay: string): StructureDefinition {
    return parseStructure(toTokens(wordplay));
}

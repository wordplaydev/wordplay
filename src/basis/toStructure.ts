import type StructureDefinition from '@nodes/StructureDefinition';
import { parseStructure } from '../parser/parseExpression';
import { toTokens } from '../parser/toTokens';

export default function toStructure(wordplay: string): StructureDefinition {
    return parseStructure(toTokens(wordplay));
}

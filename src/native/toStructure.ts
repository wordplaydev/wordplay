import type StructureDefinition from '@nodes/StructureDefinition';
import { parseStructure, toTokens } from '../parser/Parser';

export default function toStructure(wordplay: string): StructureDefinition {
    return parseStructure(toTokens(wordplay));
}

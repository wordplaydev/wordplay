import type StructureDefinition from '@nodes/StructureDefinition';
import UnparsableExpression from '@nodes/UnparsableExpression';
import { parseStructure } from '../parser/parseExpression';
import { toTokens } from '../parser/toTokens';

export default function toStructure(wordplay: string): StructureDefinition {
    const def = parseStructure(toTokens(wordplay));
    if (def instanceof UnparsableExpression)
        throw new Error('Could not parse structure definition: ' + wordplay);
    return def;
}

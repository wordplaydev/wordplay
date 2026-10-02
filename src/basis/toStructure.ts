import type StructureDefinition from '#nodes/StructureDefinition.ts';
import UnparsableExpression from '#nodes/UnparsableExpression.ts';
import { parseStructure } from '#parser/parseExpression.ts';
import { toTokens } from '#parser/toTokens.ts';

export default function toStructure(wordplay: string): StructureDefinition {
    const def = parseStructure(toTokens(wordplay));
    if (def instanceof UnparsableExpression) {
        console.log(wordplay);
        throw new Error(
            'Could not parse structure definition: ' +
                def.unparsables
                    .slice(0, 10)
                    .map((t) => t.getText())
                    .join(' '),
        );
    }
    return def;
}

import { MachineTranslated, Unwritten } from '@locale/Annotations';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import type Markup from '@nodes/Markup';
import { withColorEmoji } from '@unicode/emoji';
import parseDoc from '@parser/parseDoc';
import type Spaces from '@parser/Spaces';
import { DOCS_SYMBOL } from '@parser/Symbols';
import { toTokens } from '@parser/toTokens';

export function toMarkup(template: string): [Markup, Spaces] {
    // Ensure text has color emojis.
    template = withColorEmoji(template);

    // Check for annotations
    const unwritten = template.includes(Unwritten);
    const machineTranslated = template.includes(MachineTranslated);
    template = withoutAnnotations(template);

    // Replace out of date markers before parsing
    const tokens = toTokens(
        (template.startsWith(DOCS_SYMBOL) ? '' : DOCS_SYMBOL) +
            withoutAnnotations(template) +
            (template.endsWith(DOCS_SYMBOL) ? '' : DOCS_SYMBOL),
    );
    return [
        parseDoc(tokens).markup.withMetadata({ unwritten, machineTranslated }),
        tokens.getSpaces(),
    ];
}

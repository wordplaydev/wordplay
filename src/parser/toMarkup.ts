import { MachineTranslated, Unwritten } from '#locale/Annotations.ts';
import { withoutAnnotations } from '#locale/withoutAnnotations.ts';
import type Markup from '#nodes/Markup.ts';
import { withColorEmoji } from '#unicode/emoji.ts';
import parseDoc from '#parser/parseDoc.ts';
import type Spaces from '#parser/Spaces.ts';
import { DOCS_SYMBOL } from '#parser/Symbols.ts';
import { toTokens } from '#parser/toTokens.ts';

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

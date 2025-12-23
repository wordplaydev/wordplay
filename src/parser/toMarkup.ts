import { withoutAnnotations } from '@locale/withoutAnnotations';
import type Markup from '../nodes/Markup';
import { withColorEmoji } from '../unicode/emoji';
import parseDoc from './parseDoc';
import type Spaces from './Spaces';
import { DOCS_SYMBOL } from './Symbols';
import { toTokens } from './toTokens';

export function toMarkup(template: string): [Markup, Spaces] {
    // Ensure text has color emojis.
    template = withColorEmoji(template);

    // Replace out of date markers before parsing
    const tokens = toTokens(
        (template.startsWith(DOCS_SYMBOL) ? '' : DOCS_SYMBOL) +
            withoutAnnotations(template) +
            (template.endsWith(DOCS_SYMBOL) ? '' : DOCS_SYMBOL),
    );
    return [parseDoc(tokens).markup, tokens.getSpaces()];
}

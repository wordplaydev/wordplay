/**
 * Which characters the glyph inserter offers where the caret is, and in what
 * order.
 *
 * Two questions, answered from two different places. **Can this character lex
 * or parse here?** is the tokenizer's lexical mode, which is what keeps the ten
 * pattern atoms out of ordinary code, where they'd fall through to names.
 * **Would the value it makes fit here?** is the same `Field.getType` hook the
 * autocomplete menu filters on: inside a @Track's note list a `⊤` is not a
 * note and never could be, while a note value is exactly what belongs.
 *
 * Only a couple of dozen grammar fields declare an expected type, and only a
 * few commands insert a whole value, so most of the row keeps no opinion in
 * either direction and simply stays where it was. Silence on both counts means
 * "show it": a missing button someone wanted is worse than a spare one.
 */

import type { Command } from '@components/editor/commands/Commands';
import type Project from '@db/projects/Project';
import type Caret from '@edit/caret/Caret';
import {
    AnyContext,
    expectedTypeAt,
    getInsertContext,
} from '@edit/insertContext';

/**
 * Sorted most relevant first. Commands whose value the caret's field would
 * reject are dropped entirely.
 */
export function offeredInserts(
    commands: readonly Command[],
    project: Project | undefined,
    caret: Caret | undefined,
): Command[] {
    const where =
        project && caret ? getInsertContext(project, caret) : AnyContext;

    const lexes = commands.filter((command) =>
        // No opinion means anywhere but a pattern body, which runs its own
        // token set and would lex every other symbol here as a name.
        command.where ? command.where(where) : !where.pattern,
    );

    if (project === undefined || caret === undefined) return lexes;

    const expected = expectedTypeAt(project, caret);
    if (expected === undefined) return lexes;
    const context = project.getContext(caret.source);

    return lexes
        .map((command) => {
            const produces = command.produces?.();
            return {
                command,
                // A command offered *because* of where the caret is leads: it
                // is here for this position and nothing else.
                rank:
                    command.where !== undefined && !command.where(AnyContext)
                        ? 0
                        : produces === undefined
                          ? 2
                          : expected.accepts(produces, context)
                            ? 1
                            : 3,
            };
        })
        .filter((ranked) => ranked.rank < 3)
        .sort((a, b) => a.rank - b.rank)
        .map((ranked) => ranked.command);
}

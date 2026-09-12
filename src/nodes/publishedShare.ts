import type Conflict from '@conflicts/Conflict';
import KitCannotBorrow from '@conflicts/KitCannotBorrow';
import UndocumentedShare from '@conflicts/UndocumentedShare';
import UnexampledKit from '@conflicts/UnexampledKit';
import UnexampledShare from '@conflicts/UnexampledShare';
import Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Docs from '@nodes/Docs';
import Example from '@nodes/Example';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Source from '@nodes/Source';
import type StructureDefinition from '@nodes/StructureDefinition';

/** A definition a `↑` can publish: everything a kit can export. */
export type PublishedShare =
    Bind | FunctionDefinition | StructureDefinition | ConversionDefinition;

/**
 * What a source owes its readers, once other people can read it (#8) — one function
 * rather than four copies in `Bind`, `FunctionDefinition`, `StructureDefinition` and
 * `ConversionDefinition`, since the #1374 carve-out below must not be maintained in four
 * places.
 *
 * Silent unless the project publishes this source: `↑` also means "share with my own
 * other sources", where demanding an explanation for strangers would be noise.
 */
export function getPublishedShareConflicts(
    definition: PublishedShare,
    context: Context,
): Conflict[] {
    return context.project.isPublishedKitSource(context.source)
        ? getShareConflicts(definition, context.source)
        : [];
}

/**
 * The same rules, asked hypothetically: what *would* this definition owe if this source
 * were published?
 *
 * The publish dialog asks this, because the annotations can't answer for a kit that
 * doesn't exist yet — a project's first publish would otherwise be ungated, and then
 * gated forever after, which is exactly backwards. One implementation, two entry points,
 * so what the dialog demands and what the editor annotates cannot disagree.
 */
export function getShareConflicts(
    definition: PublishedShare,
    source: Source,
): Conflict[] {
    if (definition.share === undefined) return [];

    // Only a top-level `↑` is an export. A share inside a structure is the "static"
    // interpretation, which never crosses a source boundary, let alone a project's.
    if (!source.expression.expression.statements.some((s) => s === definition))
        return [];

    const docs = docsFor(definition, source);
    if (docs === undefined) return [new UndocumentedShare(definition.share)];

    // A value speaks for itself; a thing you *call* does not, so anything with inputs has
    // to show one use. The registry renders one of these as the kit's preview.
    if (!(definition instanceof Bind) && !hasExample(docs))
        return [new UnexampledShare(definition.share)];

    return [];
}

/**
 * A definition's documentation, or the source's own when the definition is its first
 * statement.
 *
 * Not generosity — #1374: `parseProgram` takes every leading doc as the *program's*, so
 * documentation written for the first definition in a source silently lands one level up
 * and that definition cannot be documented at all. The creator's words are there; only the
 * node they hang from is wrong. Reporting them as undocumented would blame an author for a
 * parser bug. Remove this once #1374 is decided.
 */
export function docsFor(
    definition: PublishedShare,
    source: Source,
): Docs | undefined {
    if (!definition.docs.isEmpty()) return definition.docs;
    const first = source.expression.expression.statements[0];
    const programDocs = source.expression.docs;
    return definition === first &&
        programDocs !== undefined &&
        !programDocs.isEmpty()
        ? programDocs
        : undefined;
}

function hasExample(docs: Docs): boolean {
    return examplesIn(docs).length > 0;
}

/**
 * Everything a source owes its readers, as conflicts — the whole rule, in one place, so
 * the editor's annotations and the publish dialog's checklist cannot disagree.
 *
 * Asked hypothetically, by source rather than by project, for the reason
 * {@link getShareConflicts} gives: a project's first publish would otherwise be ungated.
 */
export function getSourceShareConflicts(source: Source): Conflict[] {
    const conflicts: Conflict[] = [];
    for (const borrow of source.expression.borrows)
        conflicts.push(new KitCannotBorrow(borrow));
    for (const exported of kitExports(source))
        conflicts.push(...getShareConflicts(exported, source));
    // Without one example somewhere the registry has nothing to show, which is the whole
    // case for a kit of plain values. The absence has no node narrower than the program.
    if (kitExamples(source).length === 0)
        conflicts.push(new UnexampledKit(source.expression));
    return conflicts;
}

/** What a source publishes: its named `↑` shares, plus its `↑` conversions, which have no names. */
export function kitExports(source: Source): PublishedShare[] {
    return [...source.getShares(), ...source.getSharedConversions()].filter(
        (definition): definition is PublishedShare =>
            !('getShares' in definition),
    );
}

/**
 * Every `\…\` example a published source offers a reader, in the order a preview should
 * prefer them: the source's own doc first, then each export's.
 *
 * The source's doc is where a kit's headline example belongs — it is the description
 * someone reads first, and the natural place to put a `⭐`. An export's example is the
 * fallback, which is what keeps a kit of plain values from having no preview at all.
 */
export function kitExamples(source: Source): Example[] {
    const programDocs = source.expression.docs;
    const examples = [...examplesIn(programDocs)];
    for (const exported of kitExports(source))
        if (exported.docs !== programDocs)
            examples.push(...examplesIn(exported.docs));
    return examples;
}

function examplesIn(docs: Docs): Example[] {
    return docs.nodes().filter((n): n is Example => n instanceof Example);
}

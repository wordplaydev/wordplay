import type Conflict from '#conflicts/Conflict.ts';
import KitCannotBorrow from '#conflicts/KitCannotBorrow.ts';
import UndocumentedShare from '#conflicts/UndocumentedShare.ts';
import UnexampledKit from '#conflicts/UnexampledKit.ts';
import UnexampledShare from '#conflicts/UnexampledShare.ts';
import Bind from '#nodes/Bind.ts';
import type Context from '#nodes/Context.ts';
import type ConversionDefinition from '#nodes/ConversionDefinition.ts';
import type Docs from '#nodes/Docs.ts';
import Example from '#nodes/Example.ts';
import type FunctionDefinition from '#nodes/FunctionDefinition.ts';
import type Source from '#nodes/Source.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';

/** A definition a `↑` can publish: everything a kit can export. */
export type PublishedShare =
    Bind | FunctionDefinition | StructureDefinition | ConversionDefinition;

/**
 * What a source owes its readers, once other people can read it (#8) — one function
 * rather than four copies in `Bind`, `FunctionDefinition`, `StructureDefinition` and
 * `ConversionDefinition`.
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

    const docs = definition.docs;
    if (docs.isEmpty()) return [new UndocumentedShare(definition.share)];

    // A value speaks for itself; a thing you *call* does not, so anything with inputs has
    // to show one use. The registry renders one of these as the kit's preview.
    if (!(definition instanceof Bind) && !hasExample(docs))
        return [new UnexampledShare(definition.share)];

    return [];
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
    const examples = [...examplesIn(source.expression.docs)];
    for (const exported of kitExports(source))
        examples.push(...examplesIn(exported.docs));
    return examples;
}

function examplesIn(docs: Docs): Example[] {
    return docs.nodes().filter((n): n is Example => n instanceof Example);
}

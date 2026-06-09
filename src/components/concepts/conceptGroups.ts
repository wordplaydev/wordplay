import type Concept from '@concepts/Concept';
import type ConceptIndex from '@concepts/ConceptIndex';
import ConversionConcept from '@concepts/ConversionConcept';
import FunctionConcept from '@concepts/FunctionConcept';
import NodeConcept from '@concepts/NodeConcept';
import { Purpose, type PurposeType } from '@concepts/Purpose';
import StructureConcept from '@concepts/StructureConcept';
import { Projects } from '@db/Database';
import type Project from '@db/projects/Project';
import type LanguageCode from '@locale/LanguageCode';
import {
    getLanguageQuoteClose,
    getLanguageQuoteOpen,
} from '@locale/LanguageCode';
import type LocaleText from '@locale/LocaleText';
import type { HeaderAndExplanationText } from '@locale/UITexts';
import CompositeLiteral from '@nodes/CompositeLiteral';
import Expression from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Literal from '@nodes/Literal';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import {
    BIND_SYMBOL,
    FORMATTED_SYMBOL,
    LIST_CLOSE_SYMBOL,
    LIST_OPEN_SYMBOL,
    MEASUREMENT_SYMBOL,
    NONE_SYMBOL,
    SET_CLOSE_SYMBOL,
    SET_OPEN_SYMBOL,
    TABLE_CLOSE_SYMBOL,
    TABLE_OPEN_SYMBOL,
    TRUE_SYMBOL,
    TYPE_SYMBOL,
} from '@parser/Symbols';

/**
 * A purpose page (e.g. Outputs) is rendered as an ordered list of labeled
 * groups (e.g. outputs, arrangements, forms, …). The guide renders each
 * group's `header` above a {@link ConceptGroupView}; the Wellspring sidebar
 * ignores the header and separates groups with a horizontal bar.
 */
export type ConceptGroup = {
    header: (l: LocaleText) => HeaderAndExplanationText;
    concepts: Concept[];
};

const contentPurposes = [
    Purpose.Text,
    Purpose.Numbers,
    Purpose.Truth,
    Purpose.Lists,
    Purpose.Maps,
    Purpose.Tables,
] as const;

type ContentPurpose = (typeof contentPurposes)[number];

export function isContentPurpose(p: PurposeType): p is ContentPurpose {
    return (contentPurposes as readonly PurposeType[]).includes(p);
}

/**
 * The grouped concepts shown for a purpose page, shared by the guide and the
 * Wellspring so both stay in lockstep. Groups may be empty; callers decide
 * whether to render or skip them.
 */
export function getConceptGroups(
    purpose: PurposeType,
    index: ConceptIndex,
    project: Project,
): ConceptGroup[] {
    if (purpose === Purpose.Project)
        return [
            {
                header: (l) => l.ui.docs.purposes.Project,
                concepts: index.getPrimaryConceptsWithPurpose(Purpose.Project),
            },
        ];

    if (purpose === Purpose.Outputs) {
        const concepts = index.getPrimaryConceptsWithPurpose(purpose);
        const sourceConcept = index.getStructureConcept(
            project.shares.output.Data,
        );
        const outputs: Concept[] = [
            ...index.getInterfaceImplementers(project.shares.output.Output),
            ...(sourceConcept ? [sourceConcept] : []),
        ];
        const arrangements: Concept[] = index.getInterfaceImplementers(
            project.shares.output.Arrangement,
        );
        const forms: Concept[] = index.getInterfaceImplementers(
            project.shares.output.Form,
        );
        const styles: Concept[] = concepts.filter(
            (c) =>
                c instanceof FunctionConcept ||
                (c instanceof StructureConcept &&
                    c.definition === project.shares.output.Sequence),
        );
        const appearance: Concept[] = concepts.filter(
            (c) =>
                c instanceof StructureConcept &&
                (c.definition === project.shares.output.Color ||
                    c.definition === project.shares.output.Aura ||
                    c.definition === project.shares.output.Pose),
        );
        const other: Concept[] = concepts.filter(
            (c) =>
                !outputs.includes(c) &&
                !arrangements.includes(c) &&
                !forms.includes(c) &&
                !styles.includes(c) &&
                !appearance.includes(c) &&
                !(
                    c instanceof StructureConcept &&
                    (c.definition === project.shares.output.Form ||
                        c.definition === project.shares.output.Arrangement)
                ),
        );
        return [
            { header: (l) => l.ui.docs.purposes.Outputs, concepts: outputs },
            {
                header: (l) => l.ui.docs.header.arrangements,
                concepts: arrangements,
            },
            { header: (l) => l.ui.docs.header.forms, concepts: forms },
            {
                header: (l) => l.ui.docs.header.appearance,
                concepts: appearance,
            },
            { header: (l) => l.ui.docs.header.animation, concepts: styles },
            { header: (l) => l.ui.docs.header.location, concepts: other },
        ];
    }

    if (purpose === Purpose.Inputs) {
        const concepts = index.getPrimaryConceptsWithPurpose(purpose);
        const controls: Concept[] = concepts.filter(
            (c) => c instanceof NodeConcept,
        );
        const streams = concepts.filter((c) => !controls.includes(c));
        return [
            { header: (l) => l.ui.docs.purposes.Inputs, concepts: streams },
            {
                header: (l) => l.ui.docs.header.reactions,
                concepts: controls,
            },
        ];
    }

    if (isContentPurpose(purpose)) {
        const primary = index
            .getPrimaryConceptsWithPurpose(purpose)
            .filter(
                (s) =>
                    !(
                        s instanceof NodeConcept &&
                        (s.template instanceof Literal ||
                            s.template instanceof CompositeLiteral)
                    ),
            );
        const functions = primary
            .map((p) =>
                Array.from(p.getSubConcepts()).filter(
                    (c) => c instanceof FunctionConcept,
                ),
            )
            .flat();
        const conversions = primary
            .map((p) =>
                Array.from(p.getSubConcepts()).filter(
                    (c) => c instanceof ConversionConcept,
                ),
            )
            .flat();
        return [
            { header: (l) => l.ui.docs.purposes[purpose], concepts: primary },
            {
                header: (l) => l.ui.docs.header.functions,
                concepts: functions,
            },
            {
                header: (l) => l.ui.docs.header.conversions,
                concepts: conversions,
            },
        ];
    }

    return [
        {
            header: (l) => l.ui.docs.purposes[purpose],
            concepts: index.getPrimaryConceptsWithPurpose(purpose),
        },
    ];
}

/**
 * Icons (emoji/symbol prefixes) for each purpose, aligned with the order of
 * {@link Purpose}'s keys. Shared by the guide's purpose chooser and the
 * Wellspring's vertical category chooser. Depends on the active language for
 * the text-quote glyphs.
 */
export function getPurposeIcons(language: LanguageCode): string[] {
    return [
        '👤',
        '🖥️',
        '🖱️',
        '?',
        BIND_SYMBOL,
        getLanguageQuoteOpen(language) + getLanguageQuoteClose(language),
        MEASUREMENT_SYMBOL,
        TRUE_SYMBOL + NONE_SYMBOL,
        LIST_OPEN_SYMBOL + LIST_CLOSE_SYMBOL,
        SET_OPEN_SYMBOL + SET_CLOSE_SYMBOL,
        TABLE_OPEN_SYMBOL + TABLE_CLOSE_SYMBOL,
        FORMATTED_SYMBOL + FORMATTED_SYMBOL,
        TYPE_SYMBOL,
        '',
    ];
}

/**
 * Compute the source that recycling `node` would produce, without committing it.
 * Replaces a standalone expression with an {@link ExpressionPlaceholder} and
 * removes list items outright. Returns `[oldSource, newSource]`, or `undefined`
 * when the node isn't rooted in a {@link Source} (e.g. a palette concept), which
 * means there's nothing to remove.
 */
function getRecycledSource(
    project: Project,
    node: Node,
): [Source, Source] | undefined {
    // See if we can remove the node from its root.
    const source = project.getRoot(node)?.root;
    if (source === undefined || !(source instanceof Source)) return undefined;

    // Figure out what to replace the dragged node with. By default, we remove it.
    const type =
        node instanceof Expression
            ? node.getType(project.getContext(source))
            : undefined;
    const replacement =
        node instanceof Expression && !source.root.inList(node)
            ? ExpressionPlaceholder.make(type)
            : undefined;

    const newSource = source.withProgram(
        source.expression.replace(node, replacement),
        source.spaces.withReplacement(node, replacement),
    );

    return [source, newSource];
}

/**
 * True if dragging `node` to a recycle target (the Wellspring bin or the Guide
 * documentation) would actually remove it. Rejected — and so `false` — when the
 * node isn't in a source (nothing to remove), or when the removal would
 * introduce a new blocking (Error) conflict / unparsable code. A required node
 * that blanks to an {@link ExpressionPlaceholder} (a Minor conflict) is fine.
 */
export function canRecycleDraggedNode(project: Project, node: Node): boolean {
    const result = getRecycledSource(project, node);
    if (result === undefined) return false;
    const [source, newSource] = result;
    // A recycle that doesn't change the source removes nothing — e.g. the root block, which
    // descendant-replacement can't target. Treat it as not removable.
    if (source.isEqualTo(newSource)) return false;
    return project.getNewConflicts(source, newSource).length === 0;
}

/**
 * Remove a node that was dragged out of the editor from its source, revising
 * the project. Shared by the guide (drop-on-documentation) and the Wellspring's
 * recycle bin. Replaces a standalone expression with an
 * {@link ExpressionPlaceholder}; removes list items outright.
 */
export function recycleDraggedNode(project: Project, node: Node): void {
    const result = getRecycledSource(project, node);
    if (result === undefined) return;
    const [source, newSource] = result;

    // Update the project with the new source files.
    Projects.reviseProject(
        project
            .withSource(source, newSource)
            .withCaret(newSource, source.getNodeFirstPosition(node) ?? 0),
    );
}

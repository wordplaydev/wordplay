import Conflict, {
    ConflictSeverity,
    type ConflictLocaleAccessor,
    type Resolutions,
} from '@conflicts/Conflict';
import type Locales from '@locale/Locales';
import type { TemplateInput } from '@locale/Locales';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

/**
 * Shared base for the pattern-sublanguage conflicts (LANGUAGE.md). They all share
 * the same shape: a single offending node and a localized explanation (optionally
 * with template inputs). Resolutions route through the shared resolver registry
 * ({@link Conflict.fromRegistry}); a conflict with a registered resolver (see
 * `registerTypeResolutions.ts`) offers real repairs, and one without falls back
 * to an explainer pointing at the node. Subclasses provide only the locale path,
 * the severity, and (when needed) the message's focus node and template inputs.
 */
export default abstract class SimplePatternConflict<
    NodeType extends Node,
> extends Conflict {
    readonly node: NodeType;

    constructor(node: NodeType, severity: ConflictSeverity) {
        super(severity);
        this.node = node;
    }

    /** The locale entry whose `explanation` describes this conflict. */
    abstract getLocalePath(): ConflictLocaleAccessor;

    /** The node the message focuses (defaults to the offending node). */
    protected focusNode(): Node {
        return this.node;
    }

    /** Template inputs for the explanation (none by default). */
    protected inputs(): Record<string, TemplateInput> {
        return {};
    }

    getMessage() {
        return {
            node: this.focusNode(),
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => this.getLocalePath()(l).explanation,
                    this.inputs(),
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        return Conflict.fromRegistry(this, context, concepts);
    }
}

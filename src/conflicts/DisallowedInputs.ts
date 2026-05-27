import type LocaleText from '@locale/LocaleText';
import StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

export class DisallowedInputs extends Conflict {
    readonly structure: StructureDefinition;

    constructor(structure: StructureDefinition) {
        super(false);
        this.structure = structure;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.StructureDefinition.conflict.DisallowedInputs;

    getMessage() {
        return {
            node: this.structure,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => DisallowedInputs.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Drop all inputs from the structure definition by constructing a new
        // one without them.
        const s = this.structure;
        const cleaned = new StructureDefinition(
            s.docs,
            s.share,
            s.type,
            s.names,
            s.interfaces,
            s.types,
            s.open,
            [],
            s.close,
            s.expression,
        );
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => DisallowedInputs.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.structure, cleaned],
                    ]),
                    newNode: cleaned,
                }),
            },
        ];
    }

    getLocalePath() {
        return DisallowedInputs.LocalePath;
    }
}

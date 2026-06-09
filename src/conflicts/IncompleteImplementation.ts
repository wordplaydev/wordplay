import type LocaleText from '@locale/LocaleText';
import StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

export class IncompleteImplementation extends Conflict {
    readonly structure: StructureDefinition;

    constructor(structure: StructureDefinition) {
        super(ConflictSeverity.Error);
        this.structure = structure;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.StructureDefinition.conflict.IncompleteImplementation;

    getMessage() {
        return {
            node: this.structure,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => IncompleteImplementation.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Remove inputs to make this an interface (one valid resolution of
        // "this can't have inputs because it has abstract members").
        const s = this.structure;
        const asInterface = new StructureDefinition(
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
                        (l) =>
                            IncompleteImplementation.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.structure, asInterface],
                    ]),
                    newNode: asInterface,
                }),
            },
        ];
    }

    getLocalePath() {
        return IncompleteImplementation.LocalePath;
    }
}

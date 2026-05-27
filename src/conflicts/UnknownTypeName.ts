import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import type NameType from '@nodes/NameType';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Node from '@nodes/Node';
import TypePlaceholder from '@nodes/TypePlaceholder';

export class UnknownTypeName extends Conflict {
    readonly name: NameType;
    readonly definition: Definition;

    constructor(name: NameType, definition: Definition) {
        super(false);
        this.name = name;
        this.definition = definition;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.NameType.conflict.UnknownTypeName;

    getMessage() {
        return {
            node: this.name,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => UnknownTypeName.LocalePath(l).explanation,
                    {
                        type: new NodeRef(this.definition, locales, context),
                    },
                ),
        };
    }

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Replace the unresolved NameType with a type placeholder so the
        // learner can pick a real type. The conflict fires when a definition
        // is found but isn't a type, so renaming would be a no-op.
        const placeholder = TypePlaceholder.make();
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnknownTypeName.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.name, placeholder],
                    ]),
                    newNode: placeholder,
                }),
            },
        ];
    }

    getLocalePath() {
        return UnknownTypeName.LocalePath;
    }
}

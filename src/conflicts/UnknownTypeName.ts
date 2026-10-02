import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type Definition from '#nodes/Definition.ts';
import type NameType from '#nodes/NameType.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Node from '#nodes/Node.ts';
import TypePlaceholder from '#nodes/TypePlaceholder.ts';

export class UnknownTypeName extends Conflict {
    readonly name: NameType;
    readonly definition: Definition;

    constructor(name: NameType, definition: Definition) {
        super(ConflictSeverity.Error);
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

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
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

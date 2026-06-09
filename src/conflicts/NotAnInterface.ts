import type LocaleText from '@locale/LocaleText';
import type Definition from '@nodes/Definition';
import type Reference from '@nodes/Reference';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import StructureDefinition from '@nodes/StructureDefinition';

export default class NotAnInterface extends Conflict {
    readonly def: Definition;
    readonly ref: Reference;

    constructor(def: Definition, ref: Reference) {
        super(ConflictSeverity.Error);
        this.def = def;
        this.ref = ref;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.StructureDefinition.conflict.NotAnInterface;

    getMessage() {
        return {
            node: this.ref,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => NotAnInterface.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        // Drop the non-interface reference from the parent's `interfaces`
        // list. The conflict fires inside a StructureDefinition's interface
        // check.
        const parent = context.source.root.getParent(this.ref);
        if (parent instanceof StructureDefinition) {
            const filtered = parent.interfaces.filter((r) => r !== this.ref);
            const newParent = parent.replace('interfaces', filtered);
            return [
                {
                    kind: 'repair',
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) => NotAnInterface.LocalePath(l).resolution,
                        ),
                    mediator: (ctx) => ({
                        newProject: ctx.project.withRevisedNodes([
                            [parent, newParent],
                        ]),
                        newNode: newParent,
                    }),
                },
            ];
        }
        return Conflict.fallbackExplainer(this, context, concepts);
    }

    getLocalePath() {
        return NotAnInterface.LocalePath;
    }
}

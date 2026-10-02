import type LocaleText from '#locale/LocaleText.ts';
import { toResolutions } from '#conflicts/Conflict.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type PropertyBind from '#nodes/PropertyBind.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Repair,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Node from '#nodes/Node.ts';
import Reference from '#nodes/Reference.ts';
import levenshtein from '#util/levenshtein.ts';

export default class InvalidProperty extends Conflict {
    readonly definition: StructureDefinition;
    readonly refine: PropertyBind;

    constructor(definition: StructureDefinition, refine: PropertyBind) {
        super(ConflictSeverity.Error);

        this.definition = definition;
        this.refine = refine;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.PropertyBind.conflict.InvalidProperty;

    getMessage() {
        return {
            node: this.definition.names,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => InvalidProperty.LocalePath(l).explanation,
                    {
                        structure: new NodeRef(
                            this.refine.reference.name ?? this.refine.reference,
                            locales,
                            context,
                        ),
                    },
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        // Suggest property names on the structure that are Levenshtein-close
        // to the unresolved reference's name.
        const ref = this.refine.reference.name;
        if (ref === undefined)
            return Conflict.fallbackExplainer(this, context, concepts);
        const given = ref.getName();
        const candidates: Repair[] = [];
        for (const input of this.definition.inputs) {
            for (const name of input.names.names) {
                const text = name.getName();
                if (text === undefined || text === given) continue;
                if (levenshtein(given, text) > 2) continue;
                const newRef = Reference.make(text);
                candidates.push({
                    kind: 'repair',
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) => InvalidProperty.LocalePath(l).resolution,
                            { name: text },
                        ),
                    mediator: (ctx) => ({
                        newProject: ctx.project.withRevisedNodes([
                            [ref, newRef],
                        ]),
                        newNode: newRef,
                    }),
                });
                break;
            }
        }
        return (
            toResolutions(candidates) ??
            Conflict.fallbackExplainer(this, context, concepts)
        );
    }

    getLocalePath() {
        return InvalidProperty.LocalePath;
    }
}

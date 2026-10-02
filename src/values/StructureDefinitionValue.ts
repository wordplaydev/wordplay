import type LocaleText from '#locale/LocaleText.ts';
import getConceptName from '#locale/getConceptName.ts';
import Bind from '#nodes/Bind.ts';
import FunctionDefinition from '#nodes/FunctionDefinition.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import StructureType from '#nodes/StructureType.ts';
import { TYPE_SYMBOL } from '#parser/Symbols.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import FunctionValue from '#values/FunctionValue.ts';
import type Value from '#values/Value.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import type Locales from '#locale/Locales.ts';
import SimpleValue from '#values/SimpleValue.ts';

export default class StructureDefinitionValue extends SimpleValue {
    /** The definition from the AST. */
    readonly definition: StructureDefinition;

    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation | undefined;

    /** Values of static binds, computed once when the structure definition
     *  itself was evaluated. Keyed by the Bind AST node so name overrides
     *  across siblings still resolve to the right value. */
    readonly statics: Map<Bind, Value>;

    constructor(
        definition: StructureDefinition,
        context?: Evaluation,
        statics?: Map<Bind, Value>,
    ) {
        super(definition);

        this.definition = definition;
        this.context = context;
        this.statics = statics ?? new Map();
    }

    getType() {
        return new StructureType(this.definition, []);
    }

    getBasisTypeName(): BasisTypeName {
        return 'structure';
    }

    /** Property access on a structure definition (e.g. `Math.pi`,
     *  `Math.square`) — resolves only static members of the definition. */
    resolve(name: string, evaluator?: Evaluator): Value | undefined {
        if (evaluator !== undefined) {
            const context = evaluator.project.getContext(
                evaluator.project.getMain(),
            );
            const def = this.definition.getStaticDefinition(name, context);
            if (def instanceof Bind) {
                // Static bind: return its cached value if we have one.
                let cached = this.statics.get(def);
                if (cached !== undefined) return cached;
                // Otherwise try the definition's native static-builder
                // (used by basis structures whose static values can be
                // constructed directly in TypeScript without going through
                // the wordplay source compile path — see e.g. Color's BCT
                // builder). Populate once and reuse.
                const builder = this.definition.staticBuilder;
                if (builder !== undefined && this.statics.size === 0) {
                    const built = builder(evaluator, this.definition);
                    for (const [k, v] of built) this.statics.set(k, v);
                    cached = this.statics.get(def);
                    if (cached !== undefined) return cached;
                }
            }
            if (def instanceof FunctionDefinition) {
                // Static function: wrap with this definition value as closure
                // (no instance), so its body sees the surrounding scope.
                return new FunctionValue(def, this);
            }
        }
        // Fall through to basis-function resolution.
        return evaluator === undefined
            ? undefined
            : super.resolve(name, evaluator);
    }

    toWordplay(locales?: Locales) {
        return `${TYPE_SYMBOL}${
            locales
                ? locales.getName(this.definition.names)
                : this.definition.getNames()[0]
        }`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof StructureDefinitionValue &&
            this.definition === value.definition &&
            this.context === value.context
        );
    }

    getDescription() {
        return (l: LocaleText) => getConceptName(l, 'structure');
    }

    getRepresentativeText(locales: Locales) {
        return (
            TYPE_SYMBOL + this.definition.getPreferredName(locales.getLocales())
        );
    }

    getSize() {
        return 1;
    }
}

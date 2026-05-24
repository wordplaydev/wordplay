import type LocaleText from '@locale/LocaleText';
import Bind from '@nodes/Bind';
import FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import { TYPE_SYMBOL } from '@parser/Symbols';
import type Evaluator from '@runtime/Evaluator';
import type Evaluation from '@runtime/Evaluation';
import FunctionValue from '@values/FunctionValue';
import type Value from '@values/Value';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Locales from '@locale/Locales';
import SimpleValue from '@values/SimpleValue';

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
                // Static bind: return its pre-computed value.
                const fromMap = this.statics.get(def);
                if (fromMap !== undefined) return fromMap;
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
        return (l: LocaleText) => l.term.structure;
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

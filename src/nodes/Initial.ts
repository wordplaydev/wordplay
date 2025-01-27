import type Conflict from '@conflicts/Conflict';
import type Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import type Step from '@runtime/Step';
import type TypeSet from './TypeSet';
import Sym from './Sym';
import { INITIAL_SYMBOL } from '@parser/Symbols';
import BoolValue from '@values/BoolValue';
import { node, type Grammar, type Replacement } from './Node';
import SimpleExpression from './SimpleExpression';
import BooleanType from './BooleanType';
import StartFinish from '@runtime/StartFinish';
import type Node from './Node';
import Characters from '../lore/BasisCharacters';
import Purpose from '../concepts/Purpose';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import type { NodeDescriptor } from '@locale/NodeTexts';

export default class Initial extends SimpleExpression {
    readonly diamond: Token;

    constructor(change: Token) {
        super();

        this.diamond = change;

        this.computeChildren();
    }

    static make() {
        return new Initial(new Token(INITIAL_SYMBOL, Sym.Initial));
    }

    static getPossibleReplacements() {
        return [Initial.make()];
    }

    static getPossibleAppends() {
        return [Initial.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'Initial';
    }

    getGrammar(): Grammar {
        return [{ name: 'diamond', kind: node(Sym.Initial) }];
    }

    clone(replace?: Replacement) {
        return new Initial(
            this.replaceChild('diamond', this.diamond, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Decide;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'stream';
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    computeType(): Type {
        return BooleanType.make();
    }

    getDependencies(): Expression[] {
        return [];
    }

    /** Initial is stream dependent, so never constant. */
    isConstant() {
        return false;
    }

    isInternal(): boolean {
        return false;
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return new BoolValue(this, evaluator.isInitialEvaluation());
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getStart() {
        return this.diamond;
    }

    getFinish(): Node {
        return this.diamond;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Initial);
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Initial.name);
    }

    getCharacter() {
        return Characters.Initial;
    }
}

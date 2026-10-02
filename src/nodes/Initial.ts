import type Conflict from '#conflicts/Conflict.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { INITIAL_SYMBOL } from '#parser/Symbols.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import StartFinish from '#runtime/StartFinish.ts';
import type Step from '#runtime/Step.ts';
import BoolValue from '#values/BoolValue.ts';
import type Value from '#values/Value.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import BooleanType from '#nodes/BooleanType.ts';
import type Expression from '#nodes/Expression.ts';
import type Node from '#nodes/Node.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import SimpleExpression from '#nodes/SimpleExpression.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

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

    static getPossibleInsertions() {
        return [Initial.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'Initial';
    }

    getGrammar(): Grammar {
        return [{ name: 'diamond', kind: node(Sym.Initial), label: undefined }];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new Initial(this.replaceChild('diamond', this.diamond, replace)),
        );
    }

    getPurpose() {
        return Purpose.Advanced;
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

    static readonly LocalePath = (l: LocaleText) => l.node.Initial;
    getLocalePath() {
        return Initial.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Initial.name);
    }

    getCharacter() {
        return Characters.Initial;
    }
}

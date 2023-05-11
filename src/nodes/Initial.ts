import type Conflict from '@conflicts/Conflict';
import type Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import type Step from '@runtime/Step';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import TokenType from './TokenType';
import { INITIAL_SYMBOL } from '@parser/Symbols';
import Bool from '@runtime/Bool';
import type { Replacement } from './Node';
import type Locale from '@translation/Locale';
import AtomicExpression from './AtomicExpression';
import BooleanType from './BooleanType';
import StartFinish from '../runtime/StartFinish';
import type Node from './Node';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';

export default class Initial extends AtomicExpression {
    readonly diamond: Token;

    constructor(change: Token) {
        super();

        this.diamond = change;

        this.computeChildren();
    }

    static make() {
        return new Initial(new Token(INITIAL_SYMBOL, TokenType.Initial));
    }

    getGrammar() {
        return [{ name: 'diamond', types: [Token] }];
    }

    clone(replace?: Replacement) {
        return new Initial(
            this.replaceChild('diamond', this.diamond, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Decide;
    }

    getAffiliatedType(): NativeTypeName | undefined {
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

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return new Bool(this, evaluator.isInitialEvaluation());
    }

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet) {
        return current;
    }

    getStart() {
        return this.diamond;
    }

    getFinish(): Node {
        return this.diamond;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Initial;
    }

    getStartExplanations(translation: Locale) {
        return translation.node.Initial.description;
    }

    getGlyphs() {
        return Glyphs.Initial;
    }
}

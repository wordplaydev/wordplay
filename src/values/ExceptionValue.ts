import ExceptionType from '@nodes/ExceptionType';
import SimpleValue from './SimpleValue';
import type Step from '@runtime/Step';
import type Evaluator from '@runtime/Evaluator';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Node from '@nodes/Node';
import type Expression from '../nodes/Expression';
import type { ExceptionText } from '../locale/NodeTexts';
import type Markup from '../nodes/Markup';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

export default abstract class ExceptionValue extends SimpleValue {
    readonly evaluator: Evaluator;
    readonly step?: Step;

    constructor(creator: Expression, evaluator: Evaluator) {
        super(creator);

        this.evaluator = evaluator;
        this.step = evaluator.getCurrentStep();
    }

    getNodeContext(node: Node) {
        return this.evaluator.project.getNodeContext(node);
    }

    isEqualTo(): boolean {
        return false;
    }

    getType() {
        return new ExceptionType(this);
    }

    abstract getExceptionText(locales: Locales): ExceptionText;

    getDescription(concretize: Concretizer, locales: Locales) {
        return concretize(locales, this.getExceptionText(locales).description);
    }

    abstract getExplanation(locales: Locales): Markup;

    getBasisTypeName(): BasisTypeName {
        return 'exception';
    }

    getRepresentativeText() {
        return '!';
    }

    toWordplay(): string {
        return '!' + this.constructor.name;
    }

    getSize() {
        return 1;
    }
}

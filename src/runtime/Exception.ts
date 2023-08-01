import ExceptionType from '@nodes/ExceptionType';
import Simple from './Simple';
import type Step from './Step';
import type Evaluator from './Evaluator';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Node from '@nodes/Node';
import type Expression from '../nodes/Expression';
import concretize from '../locale/concretize';
import type Locale from '../locale/Locale';
import type { ExceptionText } from '../locale/NodeTexts';
import type Markup from '../nodes/Markup';

export default abstract class Exception extends Simple {
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

    abstract getExceptionText(locale: Locale): ExceptionText;

    getDescription(locale: Locale) {
        return concretize(locale, this.getExceptionText(locale).description);
    }

    abstract getExplanation(locale: Locale): Markup;

    getBasisTypeName(): BasisTypeName {
        return 'exception';
    }

    toWordplay(): string {
        return '!' + this.constructor.name;
    }

    getSize() {
        return 1;
    }
}

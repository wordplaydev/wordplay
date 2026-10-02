import type LocaleText from '#locale/LocaleText.ts';
import getConceptName from '#locale/getConceptName.ts';
import ExceptionType from '#nodes/ExceptionType.ts';
import type Node from '#nodes/Node.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import type Step from '#runtime/Step.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import type Locales from '#locale/Locales.ts';
import type { ExceptionText } from '#locale/NodeTexts.ts';
import type Expression from '#nodes/Expression.ts';
import type Markup from '#nodes/Markup.ts';
import SimpleValue from '#values/SimpleValue.ts';

export default abstract class ExceptionValue extends SimpleValue {
    readonly evaluator: Evaluator;
    readonly step: Step | undefined;

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

    abstract getExceptionText(
        locales: Locales,
    ): ExceptionText<readonly string[], readonly string[]>;

    getDescription() {
        return (l: LocaleText) => getConceptName(l, 'exception');
    }

    /** The concise per-exception-kind description, concretized as markup. Shown next to
     *  the ! in the editor's stepping value view and as a header on stage. */
    getExceptionDescription(locales: Locales): Markup {
        return locales.concretize(this.getExceptionText(locales).description);
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

import type { BasisTypeName } from '@basis/BasisConstants';
import getConceptName from '@locale/getConceptName';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type Expression from '@nodes/Expression';
import KitType from '@nodes/KitType';
import type Source from '@nodes/Source';
import type Evaluation from '@runtime/Evaluation';
import SimpleValue from '@values/SimpleValue';
import type Value from '@values/Value';

/**
 * A borrowed kit at run time, so `colors.sunset` can say which kit it means (#1373).
 *
 * It holds the evaluation of the kit's own root block — the one `Borrow` already reads to
 * bind a named share — and resolves a name against it, which is what makes the value a
 * borrower gets through the namespace the same value they get flat.
 */
export default class KitValue extends SimpleValue {
    readonly source: Source;
    /** The kit's evaluated root block, holding every binding its program made. */
    readonly evaluation: Evaluation;

    constructor(creator: Expression, source: Source, evaluation: Evaluation) {
        super(creator);

        this.source = source;
        this.evaluation = evaluation;
    }

    getType() {
        return new KitType(this.source);
    }

    getBasisTypeName(): BasisTypeName {
        return 'internal';
    }

    /** Only what the kit shares. A kit's private helpers are in its evaluation too, and
     *  they are not the borrower's to reach — the same restriction `KitType` makes at
     *  check time, so the two can't disagree. */
    resolve(name: string): Value | undefined {
        return this.source.getShare(name) === undefined
            ? undefined
            : this.evaluation.resolve(name);
    }

    toWordplay(locales?: Locales) {
        return locales
            ? locales.getName(this.source.names)
            : (this.source.getNames()[0] ?? '');
    }

    isEqualTo(value: Value): boolean {
        return value instanceof KitValue && this.source === value.source;
    }

    getDescription() {
        return (l: LocaleText) => getConceptName(l, 'kit');
    }

    getRepresentativeText(locales: Locales) {
        return locales.getName(this.source.names);
    }

    getSize() {
        return 1;
    }
}

import type LocaleText from '@locale/LocaleText';
import type Definition from '@nodes/Definition';
import type Reference from '@nodes/Reference';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class NotAnInterface extends Conflict {
    readonly def: Definition;
    readonly ref: Reference;

    constructor(def: Definition, ref: Reference) {
        super(false);
        this.def = def;
        this.ref = ref;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.StructureDefinition.conflict.NotAnInterface;

    getMessage() {
        return {
            node: this.ref,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => NotAnInterface.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return NotAnInterface.LocalePath;
    }
}

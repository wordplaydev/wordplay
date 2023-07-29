import type Locale from '../locale/Locale';
import concretize from '../locale/concretize';
import type { NativeTypeName } from '../native/NativeConstants';
import type Docs from '../nodes/Docs';
import DocsType from '../nodes/DocsType';
import type Markup from '../nodes/Markup';
import type Type from '../nodes/Type';
import Primitive from './Primitive';
import type Value from './Value';

export default class DocsValue extends Primitive {
    readonly docs: Docs;

    constructor(docs: Docs) {
        super(docs);
        this.docs = docs;
    }

    getType(): Type {
        return DocsType.make();
    }

    getNativeTypeName(): NativeTypeName {
        return 'docs';
    }

    isEqualTo(value: Value): boolean {
        return value instanceof DocsValue && value.docs.isEqualTo(this.docs);
    }

    getDescription(locale: Locale): Markup {
        return concretize(locale, locale.node.Docs.name);
    }

    getSize(): number {
        return this.docs.docs.length;
    }

    toWordplay() {
        return this.docs.toWordplay();
    }
}

import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import type NameType from '@nodes/NameType';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/locales/concretize';

export class UnknownTypeName extends Conflict {
    readonly name: NameType;
    readonly definition: Definition;

    constructor(name: NameType, definition: Definition) {
        super(false);
        this.name = name;
        this.definition = definition;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.name,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.InvalidTypeName,
                        new NodeLink(this.definition, locale, context)
                    ),
            },
        };
    }
}

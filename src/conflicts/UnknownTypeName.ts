import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import type NameType from '@nodes/NameType';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class UnknownTypeName extends Conflict {
    readonly name: NameType;
    readonly definition: Definition;

    constructor(name: NameType, definition: Definition) {
        super(false);
        this.name = name;
        this.definition = definition;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.NameType.conflict.UnknownTypeName;

    getConflictingNodes() {
        return {
            primary: {
                node: this.name,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnknownTypeName.LocalePath(l).primary,
                        new NodeRef(this.definition, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return UnknownTypeName.LocalePath;
    }
}

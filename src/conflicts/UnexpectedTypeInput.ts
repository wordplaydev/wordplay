import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type NameType from '@nodes/NameType';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class UnexpectedTypeInput extends Conflict {
    readonly evaluate: NameType | Evaluate;
    readonly type: Type;
    readonly definition: StructureDefinition | FunctionDefinition;

    constructor(
        evaluate: NameType | Evaluate,
        type: Type,
        definition: StructureDefinition | FunctionDefinition,
    ) {
        super(false);
        this.evaluate = evaluate;
        this.type = type;
        this.definition = definition;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Evaluate.conflict.UnexpectedTypeInput;

    getConflictingNodes() {
        return {
            primary: {
                node: this.type,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnexpectedTypeInput.LocalePath(l).primary,
                        new NodeRef(
                            this.definition.names,
                            locales,
                            context,
                            locales.getName(this.definition.names),
                        ),
                    ),
            },
            secondary: {
                node: this.definition.names,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnexpectedTypeInput.LocalePath(l).secondary,
                        new NodeRef(this.type, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return UnexpectedTypeInput.LocalePath;
    }
}

import type { NativeTypeName } from '../native/NativeConstants';
import type Context from './Context';
import NativeType from './NativeType';
import type Token from './Token';
import Type from './Type';
import SetOpenToken from './SetOpenToken';
import SetCloseToken from './SetCloseToken';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import type Conflict from '@conflicts/Conflict';
import type TypeSet from './TypeSet';
import { node, type Grammar, type Replacement, optional } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import NodeRef from '../locale/NodeRef';
import Symbol from './Symbol';
import type Node from './Node';

export default class SetType extends NativeType {
    readonly open: Token;
    readonly key?: Type;
    readonly close?: Token;

    constructor(open: Token, key?: Type, close?: Token) {
        super();

        this.open = open;
        this.key = key;
        this.close = close;

        this.computeChildren();
    }

    static make(key?: Type) {
        return new SetType(new SetOpenToken(), key, new SetCloseToken());
    }

    static getPossibleNodes(
        type: Type | undefined,
        node: Node,
        selected: boolean
    ) {
        return [
            SetType.make(),
            ...(node instanceof Type && selected ? [SetType.make(node)] : []),
        ];
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Symbol.SetOpen) },
            { name: 'key', kind: optional(node(Type)) },
            { name: 'close', kind: node(Symbol.SetClose) },
        ];
    }

    clone(replace?: Replacement) {
        return new SetType(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('key', this.key, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    computeConflicts(): Conflict[] {
        if (this.close === undefined)
            return [
                new UnclosedDelimiter(this, this.open, new SetCloseToken()),
            ];
        return [];
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        return types.list().every(
            (type) =>
                // If they have one, then they must be compable, and if there is a value type, they must be compatible.
                type instanceof SetType &&
                // If the key type isn't specified, any will do.
                (this.key === undefined ||
                    (this.key instanceof Type &&
                        type.key instanceof Type &&
                        this.key.accepts(type.key, context)))
        );
    }

    generalize(context: Context) {
        return SetType.make(this.key?.generalize(context));
    }

    getNativeTypeName(): NativeTypeName {
        return 'set';
    }

    resolveTypeVariable(name: string, context: Context): Type | undefined {
        const setDef = context.native.getPrimitiveDefinition('set');
        return setDef.types !== undefined &&
            setDef.types.hasVariableNamed(name) &&
            this.key instanceof Type
            ? this.key
            : undefined;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.SetType;
    }

    getGlyphs() {
        return Glyphs.Set;
    }

    getDescriptionInputs(locale: Locale, context: Context) {
        return [this.key ? new NodeRef(this.key, locale, context) : undefined];
    }
}

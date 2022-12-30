import {
    MAP_KEY_TYPE_VAR_NAMES,
    MAP_VALUE_TYPE_VAR_NAMES,
    type NativeTypeName,
} from '../native/NativeConstants';
import type Context from './Context';
import NativeType from './NativeType';
import type Node from './Node';
import Token from './Token';
import Type from './Type';
import BindToken from './BindToken';
import type Translations from './Translations';
import { TRANSLATE } from './Translations';
import SetOpenToken from './SetOpenToken';
import SetCloseToken from './SetCloseToken';
import UnclosedDelimiter from '../conflicts/UnclosedDelimiter';
import type Conflict from '../conflicts/Conflict';
import type TypeSet from './TypeSet';

export default class MapType extends NativeType {
    readonly open: Token;
    readonly key?: Type;
    readonly bind: Token;
    readonly value?: Type;
    readonly close?: Token;

    constructor(
        open: Token,
        key: Type | undefined,
        bind: Token,
        value: Type | undefined,
        close?: Token
    ) {
        super();

        this.open = open;
        this.key = key;
        this.bind = bind;
        this.value = value;
        this.close = close;

        this.computeChildren();
    }

    static make(key?: Type, value?: Type) {
        return new MapType(
            new SetOpenToken(),
            key,
            new BindToken(),
            value,
            new SetCloseToken()
        );
    }

    getGrammar() {
        return [
            { name: 'open', types: [Token] },
            { name: 'key', types: [Type, undefined] },
            { name: 'bind', types: [Token] },
            { name: 'value', types: [Type, undefined] },
            { name: 'close', types: [Token] },
        ];
    }

    clone(original?: Node, replacement?: Node) {
        return new MapType(
            this.replaceChild('open', this.open, original, replacement),
            this.replaceChild('key', this.key, original, replacement),
            this.replaceChild('bind', this.bind, original, replacement),
            this.replaceChild('value', this.value, original, replacement),
            this.replaceChild('close', this.close, original, replacement)
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
                type instanceof MapType &&
                // If they have one, then they must be compable, and if there is a value type, they must be compatible.
                // If the key type isn't specified, any will do.
                (this.key === undefined ||
                    (this.key instanceof Type &&
                        type.key instanceof Type &&
                        this.key.accepts(type.key, context))) &&
                // If the value type isn't specified, any will do.
                (this.value === undefined ||
                    (this.value instanceof Type &&
                        type.value instanceof Type &&
                        this.value.accepts(type.value, context)))
        );
    }

    getNativeTypeName(): NativeTypeName {
        return 'map';
    }

    resolveTypeVariable(name: string): Type | undefined {
        return Object.values(MAP_KEY_TYPE_VAR_NAMES).includes(name) &&
            this.key instanceof Type
            ? this.key
            : Object.values(MAP_VALUE_TYPE_VAR_NAMES).includes(name) &&
              this.value instanceof Type
            ? this.value
            : undefined;
    }

    getDescriptions(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'A map type',
        };
    }
}

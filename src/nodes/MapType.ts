import type { NativeTypeName } from '../native/NativeConstants';
import type Context from './Context';
import NativeType from './NativeType';
import Token from './Token';
import Type from './Type';
import BindToken from './BindToken';
import SetOpenToken from './SetOpenToken';
import SetCloseToken from './SetCloseToken';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import type Conflict from '@conflicts/Conflict';
import type TypeSet from './TypeSet';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';

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

    clone(replace?: Replacement) {
        return new MapType(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('key', this.key, replace),
            this.replaceChild('bind', this.bind, replace),
            this.replaceChild('value', this.value, replace),
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

    resolveTypeVariable(name: string, context: Context): Type | undefined {
        const mapDef = context.native.getMapDefinition();
        return mapDef.types !== undefined &&
            mapDef.types.variables[0].hasName(name) &&
            this.key instanceof Type
            ? this.key
            : mapDef.types !== undefined &&
              mapDef.types.variables[1].hasName(name) &&
              this.value instanceof Type
            ? this.value
            : undefined;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.MapType;
    }
}

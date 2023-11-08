import type { BasisTypeName } from '../basis/BasisConstants';
import type Context from './Context';
import BasisType from './BasisType';
import type Token from './Token';
import Type from './Type';
import BindToken from './BindToken';
import SetOpenToken from './SetOpenToken';
import SetCloseToken from './SetCloseToken';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import type Conflict from '@conflicts/Conflict';
import type TypeSet from './TypeSet';
import { node, type Grammar, type Replacement, any, none } from './Node';
import Glyphs from '../lore/Glyphs';
import NodeRef from '../locale/NodeRef';
import Sym from './Sym';
import TypePlaceholder from './TypePlaceholder';
import type Node from './Node';
import type Locales from '../locale/Locales';

export default class MapType extends BasisType {
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

    static getPossibleNodes(
        type: Type | undefined,
        node: Node,
        selected: boolean
    ) {
        return [
            MapType.make(),
            ...(node instanceof Type && selected
                ? [MapType.make(node, TypePlaceholder.make())]
                : []),
        ];
    }

    getDescriptor() {
        return 'MapType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.SetOpen) },
            { name: 'key', kind: any(node(Type), none('value')) },
            { name: 'bind', kind: node(Sym.Bind) },
            { name: 'value', kind: any(node(Type), none('key')) },
            { name: 'close', kind: node(Sym.SetClose) },
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
                    type.key === undefined ||
                    (type.key instanceof Type &&
                        this.key.accepts(type.key, context))) &&
                // If the value type isn't specified, any will do.
                (this.value === undefined ||
                    type.key === undefined ||
                    (type.value instanceof Type &&
                        this.value.accepts(type.value, context)))
        );
    }

    generalize(context: Context) {
        return MapType.make(
            this.key?.generalize(context),
            this.value?.generalize(context)
        );
    }

    getBasisTypeName(): BasisTypeName {
        return 'map';
    }

    resolveTypeVariable(name: string, context: Context): Type | undefined {
        const mapDef = context.getBasis().getSimpleDefinition('map');
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.MapType);
    }

    getGlyphs() {
        return Glyphs.Map;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return [
            this.key ? new NodeRef(this.key, locales, context) : undefined,
            this.value ? new NodeRef(this.value, locales, context) : undefined,
        ];
    }
}

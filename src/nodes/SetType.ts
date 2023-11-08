import type { BasisTypeName } from '../basis/BasisConstants';
import type Context from './Context';
import BasisType from './BasisType';
import type Token from './Token';
import Type from './Type';
import SetOpenToken from './SetOpenToken';
import SetCloseToken from './SetCloseToken';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import type Conflict from '@conflicts/Conflict';
import type TypeSet from './TypeSet';
import { node, type Grammar, type Replacement, optional } from './Node';
import Glyphs from '../lore/Glyphs';
import NodeRef from '../locale/NodeRef';
import Sym from './Sym';
import type Node from './Node';
import type Locales from '../locale/Locales';

export default class SetType extends BasisType {
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

    getDescriptor() {
        return 'SetType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.SetOpen) },
            { name: 'key', kind: optional(node(Type)) },
            { name: 'close', kind: node(Sym.SetClose) },
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
                // If this set's key type isn't specified, it will accept any key type
                (this.key === undefined ||
                    // If it is a specific type, see if the other set's type is unspecified or compatible
                    type.key === undefined ||
                    (type.key instanceof Type &&
                        this.key.accepts(type.key, context)))
        );
    }

    generalize(context: Context) {
        return SetType.make(this.key?.generalize(context));
    }

    getBasisTypeName(): BasisTypeName {
        return 'set';
    }

    resolveTypeVariable(name: string, context: Context): Type | undefined {
        const setDef = context.getBasis().getSimpleDefinition('set');
        return setDef.types !== undefined &&
            setDef.types.hasVariableNamed(name) &&
            this.key instanceof Type
            ? this.key
            : undefined;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.SetType);
    }

    getGlyphs() {
        return Glyphs.Set;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return [this.key ? new NodeRef(this.key, locales, context) : undefined];
    }
}

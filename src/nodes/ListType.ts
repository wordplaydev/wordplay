import type { BasisTypeName } from '../basis/BasisConstants';
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from '@parser/Symbols';
import type Context from './Context';
import BasisType from './BasisType';
import Token from './Token';
import Sym from './Sym';
import Type from './Type';
import type TypeSet from './TypeSet';
import { node, type Grammar, type Replacement, optional } from './Node';
import Glyphs from '../lore/Glyphs';
import NodeRef from '../locale/NodeRef';
import type Node from './Node';
import type Locales from '../locale/Locales';

export default class ListType extends BasisType {
    readonly open: Token;
    readonly type: Type | undefined;
    readonly close: Token | undefined;
    // In some cases we know the length of a list and the index in an accessor and can use this to narrow types.
    readonly length?: number;

    constructor(
        open: Token,
        type: Type | undefined,
        close: Token | undefined,
        length?: number
    ) {
        super();

        this.open = open;
        this.type = type;
        this.close = close;
        this.length = length;

        this.computeChildren();
    }

    static make(type?: Type, length?: number) {
        return new ListType(
            new Token(LIST_OPEN_SYMBOL, Sym.ListOpen),
            type,
            new Token(LIST_CLOSE_SYMBOL, Sym.ListClose),
            length
        );
    }

    static getPossibleNodes(
        type: Type | undefined,
        node: Node,
        selected: boolean
    ) {
        return [
            ListType.make(),
            ...(node instanceof Type && selected ? [ListType.make(node)] : []),
        ];
    }

    getDescriptor() {
        return 'ListType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.ListOpen) },
            { name: 'type', kind: optional(node(Type)) },
            { name: 'close', kind: node(Sym.ListClose) },
        ];
    }

    clone(replace?: Replacement) {
        return new ListType(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('type', this.type, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    computeConflicts() {
        return;
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        return types.list().every(
            (type) =>
                type instanceof ListType &&
                // If this list type has no type specified, any will do.
                (this.type === undefined ||
                    // If the given type has no type specified, any will do
                    type.type === undefined ||
                    this.type.accepts(type.type, context))
        );
    }

    generalize(context: Context) {
        return ListType.make(this.type?.generalize(context));
    }

    getBasisTypeName(): BasisTypeName {
        return 'list';
    }

    resolveTypeVariable(name: string, context: Context): Type | undefined {
        const listDef = context.getBasis().getSimpleDefinition('list');
        return listDef.types !== undefined &&
            listDef.types.hasVariableNamed(name)
            ? this.type
            : undefined;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.ListType);
    }

    getGlyphs() {
        return Glyphs.List;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return [
            this.type ? new NodeRef(this.type, locales, context) : undefined,
        ];
    }
}

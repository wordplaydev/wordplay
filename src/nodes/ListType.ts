import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Locales from '@locale/Locales';
import NodeRef from '@locale/NodeRef';
import Characters from '../lore/BasisCharacters';
import BasisType from '@nodes/BasisType';
import type Context from '@nodes/Context';
import ListLiteral from '@nodes/ListLiteral';
import { list, node, type Grammar, type Replacement } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import UnionType from '@nodes/UnionType';
import ListValue from '@values/ListValue';
import type Value from '@values/Value';

export default class ListType extends BasisType {
    readonly open: Token;
    /**
     * The types of the list's items. Zero types means a list of anything (`[]`); one type means a
     * list of any length of that type (`[#]`); more than one means a list of exactly that many
     * items, one type per position (`[# '']`).
     */
    readonly types: Type[];
    readonly close: Token | undefined;
    // In some cases we know the length of a list and the index in an accessor and can use this to narrow types.
    readonly length: number | undefined;

    constructor(
        open: Token,
        types: Type[],
        close: Token | undefined,
        length?: number,
    ) {
        super();

        this.open = open;
        this.types = types;
        this.close = close;
        this.length = length;

        this.computeChildren();
    }

    /** Make a list type with fresh delimiters, so derived types never share tokens. */
    private static of(types: Type[], length?: number) {
        return new ListType(
            new Token(LIST_OPEN_SYMBOL, Sym.ListOpen),
            types,
            new Token(LIST_CLOSE_SYMBOL, Sym.ListClose),
            length,
        );
    }

    /** A list of any length, of the given type if specified. */
    static make(type?: Type, length?: number) {
        return ListType.of(type ? [type] : [], length);
    }

    /** A list of exactly the given types, one per position. */
    static tuple(types: Type[]) {
        return ListType.of(types);
    }

    static getPossibleReplacements({ node }: ReplaceContext) {
        return node instanceof Type
            ? [
                  ListType.make(),
                  ...(node instanceof Type ? [ListType.make(node)] : []),
              ]
            : [];
    }

    static getPossibleInsertions({}: InsertContext) {
        return [ListType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'ListType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.ListOpen), label: undefined },
            {
                name: 'types',
                kind: list(true, node(Type)),
                label: () => (l) => l.glossary.type.word,
                space: true,
            },
            { name: 'close', kind: node(Sym.ListClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new ListType(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('types', this.types, replace),
            this.replaceChild('close', this.close, replace),
            this.length,
        ) as this;
    }

    computeConflicts() {
        return [];
    }

    /** True if this type specifies a type for each position, and therefore a length. */
    isTuple() {
        return this.types.length > 1;
    }

    /** How many items a list of this type provably has, if known. */
    getArity(): number | undefined {
        return this.isTuple() ? this.types.length : this.length;
    }

    /**
     * The type expected at a position: a per-position type if this specifies them, otherwise the
     * single item type, which stands in at every position.
     */
    getTypeAt(index: number): Type | undefined {
        return this.isTuple() ? this.types[index] : this.types[0];
    }

    /** The type of any item in a list of this type, unioning the positions if there are several. */
    getItemType(context: Context): Type | undefined {
        return this.types.length === 0
            ? undefined
            : this.types.length === 1
              ? this.types[0]
              : UnionType.getPossibleUnion(context, this.types);
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        return types
            .list()
            .every(
                (type) =>
                    type instanceof ListType && this.acceptsList(type, context),
            );
    }

    private acceptsList(that: ListType, context: Context): boolean {
        // If this list type has no type specified, any will do.
        if (this.types.length === 0) return true;
        // A type per position is also a length, so reject a list we know is a different length.
        if (this.isTuple()) {
            const arity = that.getArity();
            if (arity !== undefined && arity !== this.types.length) return false;
        }
        // If the given type has no type specified, any items will do.
        if (that.types.length === 0) return true;
        // If either type doesn't say what's at each position, all we can compare is what any item
        // can be. That's lenient by design: values whose positions can't be known until they're
        // evaluated are checked then, by acceptsValue.
        if (!this.isTuple() || !that.isTuple()) {
            const expected = this.getItemType(context);
            const given = that.getItemType(context);
            return (
                expected === undefined ||
                given === undefined ||
                expected.accepts(given, context)
            );
        }
        // Both say what's at each position, so every position must be accepted.
        return this.types.every((expected, index) => {
            const given = that.types[index];
            return given !== undefined && expected.accepts(given, context);
        });
    }

    /**
     * Lists are the one type whose values carry structure their type can't express: a list of
     * mixed types has an item type that unions them, losing what's at each position. So check the
     * items themselves, so that `['hi' 1]•[# '']` is false at runtime, not just at analysis time.
     */
    acceptsValue(value: Value, context: Context): boolean {
        if (!(value instanceof ListValue)) return false;
        const arity = this.getArity();
        if (arity !== undefined && value.values.length !== arity) return false;
        return value.values.every((item, index) => {
            const expected = this.getTypeAt(index);
            // No type for this position means any item will do.
            return expected === undefined
                ? true
                : expected.acceptsValue(item, context);
        });
    }

    concretize(context: Context): Type {
        return ListType.of(
            this.types.map((type) => type.concretize(context)),
            this.length,
        );
    }

    generalize(context: Context) {
        return ListType.of(
            this.types.map((type) => type.generalize(context)),
            this.length,
        );
    }

    simplify(context: Context) {
        return ListType.of(
            this.types.map((type) => type.simplify(context)),
            this.length,
        );
    }

    getBasisTypeName(): BasisTypeName {
        return 'list';
    }

    resolveTypeVariable(name: string, context: Context): Type | undefined {
        const listDef = context.getBasis().getSimpleDefinition('list');
        return listDef.types !== undefined &&
            listDef.types.hasVariableNamed(name)
            ? this.getItemType(context)
            : undefined;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.ListType;
    getLocalePath() {
        return ListType.LocalePath;
    }

    getCharacter() {
        return Characters.List;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return {
            // Several positions can't be a single node reference, so name them all.
            type:
                this.types.length === 0
                    ? undefined
                    : this.types.length === 1
                      ? new NodeRef(this.types[0], locales, context)
                      : this.types
                            .map((type) =>
                                type.getDescription(locales, context).toText(),
                            )
                            .join(', '),
        };
    }

    getDefaultExpression(context: Context) {
        // Give a list of the right length when positions are specified, but only if every position
        // has a default; a partial list wouldn't satisfy the type anyway.
        const defaults = this.isTuple()
            ? this.types.map((type) => type.getDefaultExpression(context))
            : [];
        return ListLiteral.make(
            defaults.every((value) => value !== undefined) ? defaults : [],
        );
    }
}

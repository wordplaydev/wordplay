import type Conflict from '#conflicts/Conflict.ts';
import UnclosedDelimiter from '#conflicts/UnclosedDelimiter.ts';
import type { ReplaceContext } from '#edit/revision/EditContext.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import type Locales from '#locale/Locales.ts';
import NodeRef from '#locale/NodeRef.ts';
import Characters from '../lore/BasisCharacters';
import BasisType from '#nodes/BasisType.ts';
import BindToken from '#nodes/BindToken.ts';
import type Context from '#nodes/Context.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import MapLiteral from '#nodes/MapLiteral.ts';
import {
    any,
    node,
    none,
    type Grammar,
    type Replacement,
} from '#nodes/Node.ts';
import SetCloseToken from '#nodes/SetCloseToken.ts';
import SetOpenToken from '#nodes/SetOpenToken.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';
import Type from '#nodes/Type.ts';
import TypePlaceholder from '#nodes/TypePlaceholder.ts';
import type TypeSet from '#nodes/TypeSet.ts';

export default class MapType extends BasisType {
    readonly open: Token;
    readonly key: Type | undefined;
    readonly bind: Token;
    readonly value: Type | undefined;
    readonly close: Token | undefined;

    constructor(
        open: Token,
        key: Type | undefined,
        bind: Token,
        value: Type | undefined,
        close?: Token,
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
            SetOpenToken(),
            key,
            BindToken(),
            value,
            SetCloseToken(),
        );
    }

    static getPossibleReplacements({ node }: ReplaceContext) {
        return node instanceof Type
            ? [
                  MapType.make(node, TypePlaceholder.make()),
                  MapType.make(TypePlaceholder.make(), node),
              ]
            : [];
    }

    static getPossibleInsertions() {
        return [MapType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'MapType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.SetOpen), label: undefined },
            {
                name: 'key',
                kind: any(
                    node(Type),
                    none(['value', () => ExpressionPlaceholder.make()]),
                ),
                label: () => (l) => l.glossary.type.word,
            },
            { name: 'bind', kind: node(Sym.Bind), label: undefined },
            {
                name: 'value',
                kind: any(
                    node(Type),
                    none(['key', () => ExpressionPlaceholder.make()]),
                ),
                label: () => (l) => l.glossary.type.word,
            },
            { name: 'close', kind: node(Sym.SetClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new MapType(
                this.replaceChild('open', this.open, replace),
                this.replaceChild('key', this.key, replace),
                this.replaceChild('bind', this.bind, replace),
                this.replaceChild('value', this.value, replace),
                this.replaceChild('close', this.close, replace),
            ),
        );
    }

    computeConflicts(): Conflict[] {
        if (this.close === undefined)
            return [new UnclosedDelimiter(this, this.open, SetCloseToken())];
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
                        this.value.accepts(type.value, context))),
        );
    }

    concretize(context: Context) {
        return MapType.make(
            this.key?.concretize(context),
            this.value?.concretize(context),
        );
    }

    generalize(context: Context) {
        return MapType.make(
            this.key?.generalize(context),
            this.value?.generalize(context),
        );
    }

    getBasisTypeName(): BasisTypeName {
        return 'map';
    }

    resolveTypeVariable(name: string, context: Context): Type | undefined {
        const mapDef = context.getBasis().getSimpleDefinition('map');
        return mapDef.types !== undefined &&
            mapDef.types.variables[0]?.hasName(name) &&
            this.key instanceof Type
            ? this.key
            : mapDef.types !== undefined &&
                mapDef.types.variables[1]?.hasName(name) &&
                this.value instanceof Type
              ? this.value
              : undefined;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.MapType;
    getLocalePath() {
        return MapType.LocalePath;
    }

    getCharacter() {
        return Characters.Map;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return {
            key: this.key ? new NodeRef(this.key, locales, context) : undefined,
            value: this.value
                ? new NodeRef(this.value, locales, context)
                : undefined,
        };
    }

    getDefaultExpression() {
        return MapLiteral.make();
    }
}

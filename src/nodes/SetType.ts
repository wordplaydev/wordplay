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
import type Context from '#nodes/Context.ts';
import { node, optional, type Grammar, type Replacement } from '#nodes/Node.ts';
import SetCloseToken from '#nodes/SetCloseToken.ts';
import SetLiteral from '#nodes/SetLiteral.ts';
import SetOpenToken from '#nodes/SetOpenToken.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';
import Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

export default class SetType extends BasisType {
    readonly open: Token;
    readonly key: Type | undefined;
    readonly close: Token | undefined;

    constructor(open: Token, key?: Type, close?: Token) {
        super();

        this.open = open;
        this.key = key;
        this.close = close;

        this.computeChildren();
    }

    static make(key?: Type) {
        return new SetType(SetOpenToken(), key, SetCloseToken());
    }

    static getPossibleReplacements({ node }: ReplaceContext) {
        return [
            SetType.make(),
            ...(node instanceof Type ? [SetType.make(node)] : []),
        ];
    }

    static getPossibleInsertions() {
        return [SetType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'SetType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.SetOpen), label: undefined },
            {
                name: 'key',
                kind: optional(node(Type)),
                label: () => (l) => l.glossary.type.word,
            },
            { name: 'close', kind: node(Sym.SetClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new SetType(
                this.replaceChild('open', this.open, replace),
                this.replaceChild('key', this.key, replace),
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
                // If they have one, then they must be compable, and if there is a value type, they must be compatible.
                type instanceof SetType &&
                // If this set's key type isn't specified, it will accept any key type
                (this.key === undefined ||
                    // If it is a specific type, see if the other set's type is unspecified or compatible
                    type.key === undefined ||
                    (type.key instanceof Type &&
                        this.key.accepts(type.key, context))),
        );
    }

    concretize(context: Context): Type {
        return SetType.make(this.key?.concretize(context));
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

    static readonly LocalePath = (l: LocaleText) => l.node.SetType;
    getLocalePath() {
        return SetType.LocalePath;
    }

    getCharacter() {
        return Characters.Set;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return {
            type: this.key
                ? new NodeRef(this.key, locales, context)
                : undefined,
        };
    }

    getDefaultExpression() {
        return SetLiteral.make();
    }
}

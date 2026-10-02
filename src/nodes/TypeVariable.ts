import type { TemplateInput } from '#locale/Locales.ts';
import type Locales from '#locale/Locales.ts';
import type { InsertContext } from '#edit/revision/EditContext.ts';
import type Context from './Context';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { Purpose } from '#concepts/Purpose.ts';
import Characters from '../lore/BasisCharacters';
import { TYPE_SYMBOL } from '#parser/Symbols.ts';
import type Definition from '#nodes/Definition.ts';
import Names from '#nodes/Names.ts';
import NameType from '#nodes/NameType.ts';
import type { Grammar, Replacement } from '#nodes/Node.ts';
import Node, { any, node, none } from '#nodes/Node.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import Type from '#nodes/Type.ts';
import TypePlaceholder from '#nodes/TypePlaceholder.ts';
import TypeToken from '#nodes/TypeToken.ts';

export default class TypeVariable extends Node {
    readonly names: Names;
    readonly dot: Token | undefined;
    readonly type: Type | undefined;

    constructor(
        names: Names,
        dot?: Token | undefined,
        type?: Type | undefined,
    ) {
        super();

        this.names = names;
        this.dot = dot;
        this.type = type;

        this.computeChildren();
    }

    static make(names: Names | string[], type?: Type | undefined) {
        return new TypeVariable(
            names instanceof Names ? names : Names.make(names),
            type ? new Token(TYPE_SYMBOL, Sym.Type) : undefined,
            type,
        );
    }

    /** A type variable is only meaningful inside ⸨⸩, so it's never offered as a replacement. */
    static getPossibleReplacements() {
        return [];
    }

    /** Offer another variable wherever a grammar field holds type variables (a definition's ⸨⸩).
     * The field kind is checked rather than the parent class to avoid a cyclic import with the
     * TypeVariables container. */
    static getPossibleInsertions({ parent, field, locales }: InsertContext) {
        const kind = parent.getGrammar().find((f) => f.name === field)?.kind;
        return kind !== undefined && kind.allowsKind(TypeVariable)
            ? [
                  TypeVariable.make([
                      locales.getUnannotatedPrimaryText(
                          (l) => l.glossary.name.word,
                      ),
                  ]),
              ]
            : [];
    }

    getDescriptor(): NodeDescriptor {
        return 'TypeVariable';
    }

    getGrammar(): Grammar {
        return [
            { name: 'names', kind: node(Names), label: undefined },
            {
                name: 'dot',
                kind: any(
                    node(Sym.Type),
                    none(['type', () => TypePlaceholder.make()]),
                ),
                label: undefined,
            },
            {
                name: 'type',
                kind: any(node(Type), none(['dot', () => TypeToken()])),
                label: () => (l) => l.node.TypeVariable.label.type,
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new TypeVariable(
                this.replaceChild('names', this.names, replace),
                this.replaceChild('dot', this.dot, replace),
                this.replaceChild('type', this.type, replace),
            ),
        );
    }

    getPurpose() {
        return Purpose.Advanced;
    }

    simplify() {
        return new TypeVariable(this.names.simplify());
    }

    getReference(): NameType {
        return NameType.make(this.names.getNames()[0] ?? '_', this);
    }

    getNames() {
        return this.names.getNames();
    }

    hasName(name: string) {
        return this.names.hasName(name);
    }

    getPreferredName(locales: LocaleText | LocaleText[]) {
        return this.names.getPreferredNameString(locales);
    }

    computeConflicts() {
        return [];
    }

    /** No type variables are ever  */
    isEquivalentTo(definition: Definition) {
        return definition === this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.TypeVariable;
    getLocalePath() {
        return TypeVariable.LocalePath;
    }

    getDescriptionInputs(
        locales: Locales,
        __: Context,
    ): Record<string, TemplateInput> {
        return {
            // Not symbolic: an emoji name is unspeakable.
            name: locales.getDescriptiveName(this.names),
        };
    }

    getCharacter() {
        return Characters.Name;
    }
}

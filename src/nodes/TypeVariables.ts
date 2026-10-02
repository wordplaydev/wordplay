import type { TemplateInput } from '#locale/Locales.ts';
import type Locales from '#locale/Locales.ts';
import type Context from './Context';
import type Conflict from '#conflicts/Conflict.ts';
import DuplicateTypeVariable from '#conflicts/DuplicateTypeVariable.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { TYPE_CLOSE_SYMBOL, TYPE_OPEN_SYMBOL } from '#parser/Symbols.ts';
import { Purpose } from '#concepts/Purpose.ts';
import Characters from '../lore/BasisCharacters';
import type { InsertContext } from '#edit/revision/EditContext.ts';
import type { Grammar, Replacement } from '#nodes/Node.ts';
import Node, { list, node } from '#nodes/Node.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import TypeVariable from '#nodes/TypeVariable.ts';

export default class TypeVariables extends Node {
    readonly open: Token;
    readonly variables: TypeVariable[];
    readonly close: Token | undefined;

    constructor(open: Token, names: TypeVariable[], close: Token | undefined) {
        super();

        this.open = open;
        this.variables = names;
        this.close = close;

        this.computeChildren();
    }

    static make(variables?: TypeVariable[]) {
        return new TypeVariables(
            new Token(TYPE_OPEN_SYMBOL, Sym.TypeOpen),
            variables ?? [],
            new Token(TYPE_CLOSE_SYMBOL, Sym.TypeClose),
        );
    }

    /** Never offered as a replacement: a bare ⸨⸩ just segments its type variables. */
    static getPossibleReplacements() {
        return [];
    }

    /** Assigned into a definition's `types` field with one starter variable, so the container
     * appears only implicitly, populated — never as a bare pair of delimiters. */
    static getPossibleInsertions({ locales }: InsertContext) {
        return [
            TypeVariables.make([
                TypeVariable.make([
                    locales.getUnannotatedPrimaryText(
                        (l) => l.glossary.name.word,
                    ),
                ]),
            ]),
        ];
    }

    getDescriptor(): NodeDescriptor {
        return 'TypeVariables';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.TypeOpen), label: undefined },
            {
                name: 'variables',
                kind: list(true, node(TypeVariable)),
                label: () => (l) => l.node.TypeVariable.name,
            },
            { name: 'close', kind: node(Sym.TypeClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new TypeVariables(
                this.replaceChild('open', this.open, replace),
                this.replaceChild('variables', this.variables, replace),
                this.replaceChild('close', this.close, replace),
            ),
        );
    }

    simplify() {
        return new TypeVariables(
            this.open,
            this.variables.map((v) => v.simplify()),
            this.close,
        );
    }

    getPurpose() {
        // A segmenting container: it only groups its type variables, so it is never offered as a
        // concept itself — creators add TypeVariables implicitly via a definition's types field.
        return Purpose.Hidden;
    }

    computeConflicts() {
        const conflicts: Conflict[] = [];

        // Type variables must have unique names.
        for (const typeVar of this.variables) {
            const dupe = this.variables.find(
                (v) => v !== typeVar && v.names.sharesName(typeVar.names),
            );
            if (dupe) conflicts.push(new DuplicateTypeVariable(typeVar, dupe));
        }

        return conflicts;
    }

    hasVariableNamed(name: string) {
        return this.variables.some((variable) => variable.names.hasName(name));
    }

    static readonly LocalePath = (l: LocaleText) => l.node.TypeVariables;
    getLocalePath() {
        return TypeVariables.LocalePath;
    }

    getDescriptionInputs(
        _: Locales,
        __: Context,
    ): Record<string, TemplateInput> {
        return {
            count: this.variables.length,
        };
    }

    getCharacter() {
        return Characters.Name;
    }
}

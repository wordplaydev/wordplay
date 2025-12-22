import type Conflict from '@conflicts/Conflict';
import DuplicateTypeVariable from '@conflicts/DuplicateTypeVariable';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { TYPE_CLOSE_SYMBOL, TYPE_OPEN_SYMBOL } from '@parser/Symbols';
import Purpose from '../concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import Names from './Names';
import type { Grammar, Replacement } from './Node';
import Node, { node } from './Node';
import Sym from './Sym';
import Token from './Token';
import type TypeVariable from './TypeVariable';

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

    static getPossibleReplacements() {
        return [TypeVariables.make()];
    }

    static getPossibleAppends() {
        return [TypeVariables.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'TypeVariables';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.TypeOpen), label: undefined },
            { name: 'variables', kind: node(Names), label: undefined },
            { name: 'close', kind: node(Sym.TypeClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new TypeVariables(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('variables', this.variables, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    simplify() {
        return new TypeVariables(
            this.open,
            this.variables.map((v) => v.simplify()),
            this.close,
        );
    }

    getPurpose() {
        return Purpose.Advanced;
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

    getCharacter() {
        return Characters.Name;
    }
}

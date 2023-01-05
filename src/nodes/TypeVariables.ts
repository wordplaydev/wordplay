import Node, { type Replacement } from './Node';
import Token from './Token';
import TokenType from './TokenType';
import { TYPE_CLOSE_SYMBOL, TYPE_OPEN_SYMBOL } from '../parser/Symbols';
import Names from './Names';
import type TypeVariable from './TypeVariable';
import type Conflict from '../conflicts/Conflict';
import { typeVarsAreUnique } from './util';
import type Translation from '../translations/Translation';

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

    static make(variables: TypeVariable[]) {
        return new TypeVariables(
            new Token(TYPE_OPEN_SYMBOL, TokenType.TYPE_OPEN),
            variables,
            new Token(TYPE_CLOSE_SYMBOL, TokenType.TYPE_CLOSE)
        );
    }

    getGrammar() {
        return [
            { name: 'open', types: [Token] },
            { name: 'variables', types: [Names] },
            { name: 'close', types: [Token] },
        ];
    }

    clone(replace?: Replacement) {
        return new TypeVariables(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('variables', this.variables, replace),
            this.replaceChild('close', this.open, replace)
        ) as this;
    }

    computeConflicts() {
        const conflicts: Conflict[] = [];

        // Type variables must have unique names.
        const duplicateTypeVars = this.variables
            ? typeVarsAreUnique(this.variables)
            : undefined;
        if (duplicateTypeVars) conflicts.push(duplicateTypeVars);

        return conflicts;
    }

    hasVariableNamed(name: string) {
        return this.variables.some((variable) => variable.names.hasName(name));
    }

    getDescription(translation: Translation) {
        return translation.nodes.TypeVariables.description;
    }
}

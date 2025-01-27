import Purpose from '../concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import { TYPE_CLOSE_SYMBOL, TYPE_OPEN_SYMBOL } from '../parser/Symbols';
import type { Grammar, Replacement } from './Node';
import Token from './Token';
import Sym from './Sym';
import Type from './Type';
import Node, { list, node, optional } from './Node';
import type Locales from '../locale/Locales';
import type { NodeDescriptor } from '@locale/NodeTexts';

export default class TypeInputs extends Node {
    readonly open: Token;
    readonly types: Type[];
    readonly close: Token | undefined;

    constructor(open: Token, types: Type[], close: Token | undefined) {
        super();

        this.open = open;
        this.types = types;
        this.close = close;

        this.computeChildren();
    }

    static make(types?: Type[]) {
        return new TypeInputs(
            new Token(TYPE_OPEN_SYMBOL, Sym.TypeOpen),
            types ?? [],
            new Token(TYPE_CLOSE_SYMBOL, Sym.TypeClose),
        );
    }

    static getPossibleReplacements() {
        return [TypeInputs.make()];
    }

    static getPossibleAppends() {
        return [TypeInputs.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'TypeInputs';
    }

    getPurpose() {
        return Purpose.Type;
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.TypeOpen) },
            { name: 'types', kind: list(true, node(Type)) },
            { name: 'close', kind: optional(node(Sym.TypeClose)) },
        ];
    }

    clone(replace?: Replacement) {
        return new TypeInputs(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('types', this.types, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    computeConflicts() {
        return [];
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.TypeInputs);
    }

    getCharacter() {
        return Characters.Type;
    }
}

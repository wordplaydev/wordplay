import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Purpose from '../concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import { TYPE_SYMBOL } from '../parser/Symbols';
import type Definition from './Definition';
import Names from './Names';
import NameType from './NameType';
import type { Grammar, Replacement } from './Node';
import Node, { any, node, none } from './Node';
import Sym from './Sym';
import Token from './Token';
import Type from './Type';
import TypePlaceholder from './TypePlaceholder';
import TypeToken from './TypeToken';

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
                kind: any(node(Type), none(['dot', () => new TypeToken()])),
                label: () => (l) => l.node.TypeVariable.label.type,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new TypeVariable(
            this.replaceChild('names', this.names, replace),
            this.replaceChild('dot', this.dot, replace),
            this.replaceChild('type', this.type, replace),
        ) as this;
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

    getCharacter() {
        return Characters.Name;
    }
}

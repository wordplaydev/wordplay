import type Conflict from '@conflicts/Conflict';
import type EditContext from '@edit/EditContext';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import { CODE_SYMBOL } from '../parser/Symbols';
import Content from './Content';
import { node, type Grammar, type Replacement } from './Node';
import Program from './Program';
import Sym from './Sym';
import Token from './Token';

export default class Example extends Content {
    readonly open: Token;
    readonly program: Program;
    readonly close: Token | undefined;

    constructor(open: Token, program: Program, close: Token | undefined) {
        super();

        this.open = open;
        this.program = program;
        this.close = close;
    }

    static make(program: Program) {
        return new Example(
            new Token(CODE_SYMBOL, Sym.Code),
            program,
            new Token(CODE_SYMBOL, Sym.Code),
        );
    }

    static getPossibleReplacements({ node }: EditContext) {
        return node instanceof Content ? [Example.make(Program.make())] : [];
    }

    static getPossibleAppends() {
        return [Example.make(Program.make())];
    }

    getDescriptor(): NodeDescriptor {
        return 'Example';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.Code) },
            { name: 'program', kind: node(Program) },
            { name: 'close', kind: node(Sym.Code) },
        ];
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new Example(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('program', this.program, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Example);
    }

    getCharacter() {
        return Characters.Example;
    }

    concretize(): Example {
        return this;
    }

    toText() {
        return this.toWordplay();
    }
}

import type Conflict from '@conflicts/Conflict';
import { node, type Replacement, type Grammar } from './Node';
import Program from './Program';
import Token from './Token';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Sym from './Sym';
import { CODE_SYMBOL } from '../parser/Symbols';
import Content from './Content';
import type Locales from '../locale/Locales';

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
            new Token(CODE_SYMBOL, Sym.Code)
        );
    }

    static getPossibleNodes() {
        return [Example.make(Program.make())];
    }

    getDescriptor() {
        return 'Example';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.Code) },
            { name: 'program', kind: node(Program) },
            { name: 'close', kind: node(Sym.Code) },
        ];
    }

    computeConflicts(): void | Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new Example(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('program', this.program, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Example);
    }

    getGlyphs() {
        return Glyphs.Example;
    }

    concretize(): Example {
        return this;
    }

    toText() {
        return this.toWordplay();
    }
}

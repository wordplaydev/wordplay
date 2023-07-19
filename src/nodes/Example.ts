import type Conflict from '@conflicts/Conflict';
import type Locale from '@locale/Locale';
import { node, type Replacement, type Grammar } from './Node';
import Program from './Program';
import Token from './Token';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Symbol from './Symbol';
import { EXAMPLE_CLOSE_SYMBOL, EXAMPLE_OPEN_SYMBOL } from '../parser/Symbols';
import Content from './Content';
import type { TemplateInput } from '../locale/concretize';

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
            new Token(EXAMPLE_OPEN_SYMBOL, Symbol.ExampleOpen),
            program,
            new Token(EXAMPLE_CLOSE_SYMBOL, Symbol.ExampleClose)
        );
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', types: node(Symbol.ExampleOpen) },
            { name: 'program', types: node(Program) },
            { name: 'close', types: node(Symbol.ExampleClose) },
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

    getNodeLocale(translation: Locale) {
        return translation.node.Example;
    }

    getGlyphs() {
        return Glyphs.Example;
    }

    concretize(_: Locale, __: TemplateInput[]): Example {
        return this;
    }

    toText() {
        return this.toWordplay();
    }
}

import type Conflict from '@conflicts/Conflict';
import type Translation from '@translation/Translation';
import Node, { type Field, type Replacement } from './Node';
import Program from './Program';
import Token from './Token';
import Glyphs from '../lore/Glyphs';
import EvalOpenToken from './EvalOpenToken';
import EvalCloseToken from './EvalCloseToken';
import Purpose from '../concepts/Purpose';

export default class Example extends Node {
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
        return new Example(new EvalOpenToken(), program, new EvalCloseToken());
    }

    getGrammar(): Field[] {
        return [
            { name: 'open', types: [Token] },
            { name: 'program', types: [Program] },
            { name: 'close', types: [Token] },
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

    getNodeTranslation(translation: Translation) {
        return translation.node.Example;
    }

    getGlyphs() {
        return Glyphs.Evaluate;
    }
}

import type Conflict from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { Purpose } from '@concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import { CODE_SYMBOL, HIGHLIGHT_SYMBOL } from '@parser/Symbols';
import Content from '@nodes/Content';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import Program from '@nodes/Program';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

export default class Example extends Content {
    readonly open: Token;
    readonly program: Program;
    readonly close: Token | undefined;
    readonly highlight: Token | undefined;

    constructor(
        open: Token,
        program: Program,
        close: Token | undefined,
        highlight?: Token,
    ) {
        super();

        this.open = open;
        this.program = program;
        this.close = close;
        this.highlight = highlight;
    }

    static make(program: Program, highlighted = false) {
        return new Example(
            new Token(CODE_SYMBOL, Sym.Code),
            program,
            new Token(CODE_SYMBOL, Sym.Code),
            highlighted ? new Token(HIGHLIGHT_SYMBOL, Sym.Highlight) : undefined,
        );
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleInsertions() {
        return [Example.make(Program.make([ExpressionPlaceholder.make()]))];
    }

    getDescriptor(): NodeDescriptor {
        return 'Example';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.Code), label: undefined },
            { name: 'program', kind: node(Program), label: undefined },
            { name: 'close', kind: node(Sym.Code), label: undefined },
            { name: 'highlight', kind: node(Sym.Highlight), label: undefined },
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
            this.replaceChild('highlight', this.highlight, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Documentation;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Example;
    getLocalePath() {
        return Example.LocalePath;
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

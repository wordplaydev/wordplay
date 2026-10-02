import type Conflict from '#conflicts/Conflict.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import previewText from '#locale/previewText.ts';
import { Purpose } from '#concepts/Purpose.ts';
import Characters from '../lore/BasisCharacters';
import getPreferredSpaces from '#parser/getPreferredSpaces.ts';
import {
    CODE_SYMBOL,
    DEFECT_SYMBOL,
    HIGHLIGHT_SYMBOL,
} from '#parser/Symbols.ts';
import Content from '#nodes/Content.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import Program from '#nodes/Program.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';

export default class Example extends Content {
    readonly open: Token;
    readonly program: Program;
    readonly close: Token | undefined;
    readonly highlight: Token | undefined;
    readonly defect: Token | undefined;

    constructor(
        open: Token,
        program: Program,
        close: Token | undefined,
        highlight?: Token,
        defect?: Token,
    ) {
        super();

        this.open = open;
        this.program = program;
        this.close = close;
        this.highlight = highlight;
        this.defect = defect;
    }

    static make(program: Program, highlighted = false, defect = false) {
        return new Example(
            new Token(CODE_SYMBOL, Sym.Code),
            program,
            new Token(CODE_SYMBOL, Sym.Code),
            highlighted
                ? new Token(HIGHLIGHT_SYMBOL, Sym.Highlight)
                : undefined,
            defect ? new Token(DEFECT_SYMBOL, Sym.Defect) : undefined,
        );
    }

    /** Whether this example is annotated as expected to have conflicts (🪲), so the locale verifier permits them. */
    expectsDefect() {
        return this.defect !== undefined;
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
            { name: 'defect', kind: node(Sym.Defect), label: undefined },
        ];
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return this.cloned(
            new Example(
                this.replaceChild('open', this.open, replace),
                this.replaceChild('program', this.program, replace),
                this.replaceChild('close', this.close, replace),
                this.replaceChild('highlight', this.highlight, replace),
                this.replaceChild('defect', this.defect, replace),
            ),
        );
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

    getDescriptionInputs(): Record<string, TemplateInput> {
        // Token spacing lives in the containing Markup's spaces, not the
        // tokens, so render with preferred spacing — otherwise the code runs
        // together ("1+2") and is unreadable aloud.
        // Always a string; see Paragraph.getDescriptionInputs.
        return {
            code: previewText(
                this.program.toWordplay(getPreferredSpaces(this.program)),
            ),
        };
    }

    concretize(): Example {
        return this;
    }

    toText() {
        return this.toWordplay();
    }
}

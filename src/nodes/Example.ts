import type Conflict from '@conflicts/Conflict';
import type EditContext from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Purpose from '../concepts/Purpose';
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
            { name: 'open', kind: node(Sym.Code), label: undefined },
            { name: 'program', kind: node(Program), label: undefined },
            { name: 'close', kind: node(Sym.Code), label: undefined },
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

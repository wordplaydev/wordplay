import type Conflict from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { Purpose } from '@concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import Content from '@nodes/Content';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

/** One language variant of an ExternalExample. */
export type ExternalExampleEntry = { tag: string; code: string };

/**
 * A markup block of foreign-language code, used in tutorial content to contrast a concept in a
 * creator's prior programming language. Written as `\<tag>| <code>` variants terminated by a final
 * `\`, e.g. `\py| a = 5\js| let a = 5;\`. Unlike an @Example (which holds a real Wordplay Program),
 * the body is captured verbatim and never evaluated or type-checked — it's only displayed with
 * syntax highlighting for the active contrast language.
 */
export default class ExternalExample extends Content {
    readonly example: Token;
    /** The parsed `{ tag, code }` variants, one per language. */
    readonly entries: ExternalExampleEntry[];

    constructor(example: Token) {
        super();
        this.example = example;
        this.entries = ExternalExample.parseEntries(example.getText());
    }

    /** Parse `\py| a = 5\js| b = 5\` into `[{tag:'py', code:'a = 5'}, {tag:'js', code:'b = 5'}]`. */
    static parseEntries(text: string): ExternalExampleEntry[] {
        // Strip the surrounding `\` delimiters, then split variants (foreign code cannot contain `\`).
        const inner = text.replace(/^\\/, '').replace(/\\$/, '');
        if (inner.length === 0) return [];
        return inner.split('\\').map((part) => {
            const bar = part.indexOf('|');
            return bar < 0
                ? { tag: '', code: part.trim() }
                : {
                      tag: part.slice(0, bar).trim(),
                      code: part.slice(bar + 1).trim(),
                  };
        });
    }

    getDescriptor(): NodeDescriptor {
        return 'ExternalExample';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'example',
                kind: node(Sym.ExternalExample),
                label: undefined,
            },
        ];
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new ExternalExample(
            this.replaceChild('example', this.example, replace),
        ) as this;
    }

    /** The variant matching the given tag, falling back to Python, then the first variant. */
    getEntry(tag: string): ExternalExampleEntry | undefined {
        return (
            this.entries.find((entry) => entry.tag === tag) ??
            this.entries.find((entry) => entry.tag === 'py') ??
            this.entries[0]
        );
    }

    getPurpose() {
        return Purpose.Documentation;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.ExternalExample;
    getLocalePath() {
        return ExternalExample.LocalePath;
    }

    getCharacter() {
        return Characters.ExternalExample;
    }

    concretize(): ExternalExample {
        return this;
    }

    toText() {
        return this.toWordplay();
    }
}

import Purpose from '../concepts/Purpose';
import type Locale from '../locale/Locale';
import NodeRef from '../locale/NodeRef';
import ValueRef from '../locale/ValueRef';
import type { TemplateInput } from '../locale/concretize';
import type Glyph from '../lore/Glyph';
import Glyphs from '../lore/Glyphs';
import Content from './Content';
import { node, type Replacement, type Grammar } from './Node';
import Token from './Token';
import Symbol from './Symbol';

/**
 * To refer to an input, use a $, followed by the number of the input desired,
 * starting from 1.
 *
 *      "Hello, my name is $1"
 *
 * To indicate that you want to reuse a common phrase defined in a locale's "terminology" dictionary,
 * use a $ followed by any number of word characters (in regex, /\$\w/). This allows
 * for terminology to be changed globally without search and replace.
 *
 *      "To create a new $program, click here."
 */
export default class Mention extends Content {
    readonly name: Token;

    constructor(name: Token) {
        super();

        this.name = name;
    }

    getGrammar(): Grammar {
        return [{ name: 'name', types: node(Symbol.Mention) }];
    }
    computeConflicts() {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new Mention(
            this.replaceChild('name', this.name, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }
    getNodeLocale(locale: Locale) {
        return locale.node.Mention;
    }

    getGlyphs(): Glyph {
        return Glyphs.Mention;
    }

    concretize(
        locale: Locale,
        inputs: TemplateInput[]
    ): Token | ValueRef | NodeRef | undefined {
        const name = this.name.getText().slice(1);

        // Terminology reference
        // Is it a number? Resolve to an input.
        const numberMatch = name.match(/^[0-9]+/);
        if (name === '?')
            return new Token(locale.ui.error.unwritten, Symbol.Words);
        else if (numberMatch !== null) {
            // Find the corresponding input
            const number = parseInt(numberMatch[0]);
            const input = inputs[number - 1];

            // Return the matching input, or a placeholder if there wasn't one.
            return input instanceof ValueRef
                ? input
                : input instanceof NodeRef
                ? input
                : input === undefined
                ? undefined
                : new Token(input.toString(), Symbol.Words);
        }
        // Try to resolve terminology.
        else {
            const id = name as keyof Locale['term'];
            const phrase = Object.hasOwn(locale.term, id)
                ? locale.term[id]
                : undefined;

            return phrase ? new Token(phrase, Symbol.Words) : undefined;
        }
    }

    getDescriptionInputs() {
        return [this.id];
    }

    toText() {
        return this.toWordplay();
    }
}

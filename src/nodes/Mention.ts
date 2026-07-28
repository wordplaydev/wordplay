import Markup from '@nodes/Markup';
import Words from '@nodes/Words';
import ConceptRef from '@locale/ConceptRef';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import type { TemplateInput } from '@locale/Locales';
import NodeRef from '@locale/NodeRef';
import ValueRef from '@locale/ValueRef';
import Characters from '../lore/BasisCharacters';
import Content from '@nodes/Content';
import type Node from '@nodes/Node';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

/**
 * A `$` mention substitutes a template input by name (the `$?`/`$!` placeholders
 * are handled specially below):
 *
 *      "I expected $expected, but received $given"
 *
 * `$` here is only for input substitution. Per-locale word-list terms (`$term`)
 * are expanded to their phrase at the string level (`resolveTerms`) before the
 * template is parsed, so a term never reaches a `Mention`. Glossary terms are
 * referenced with `@term` (resolved by ConceptLink). A `$name` that is neither a
 * declared input nor an already-expanded term resolves to nothing here.
 */
export default class Mention extends Content {
    readonly name: Token;

    constructor(name: Token) {
        super();

        this.name = name;
    }

    static getPossibleReplacements() {
        return [new Mention(new Token('_', Sym.Mention))];
    }

    static getPossibleInsertions() {
        return [new Mention(new Token('_', Sym.Mention))];
    }

    getDescriptor(): NodeDescriptor {
        return 'Mention';
    }

    getGrammar(): Grammar {
        return [{ name: 'name', kind: node(Sym.Mention), label: undefined }];
    }
    computeConflicts() {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new Mention(
            this.replaceChild('name', this.name, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Documentation;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Mention;
    getLocalePath() {
        return Mention.LocalePath;
    }

    getCharacter() {
        return Characters.Mention;
    }

    concretize(
        locales: Locales,
        inputs: Record<string, TemplateInput>,
        replacements: [Node, Node][],
    ): Token | Words | ValueRef | NodeRef | ConceptRef | undefined {
        const name = this.name.getText().slice(1);

        if (name === '?') {
            const replacement = new Token(
                locales.getMultilingualText((l) => l.ui.template.unwritten),
                Sym.Words,
            );
            replacements.push([this, replacement]);
            return replacement;
        } else if (name === '!') {
            // Just return an empty token.
            const invisible = new Token('', Sym.Words);
            replacements.push([this, invisible]);
            return invisible;
        } else if (Object.prototype.hasOwnProperty.call(inputs, name)) {
            // Find the named input.
            const input = inputs[name];

            // Return the matching input, or a placeholder if it was undefined.
            // A Markup input splices its first paragraph's segments in as a
            // Words node, so concept links and formatting survive — doc
            // previews embed in templates this way. (Its spaces are merged by
            // Markup.concretize.)
            const replacement =
                input instanceof ValueRef ||
                input instanceof NodeRef ||
                input instanceof ConceptRef
                    ? input
                    : input instanceof Markup
                      ? new Words(
                            undefined,
                            input.paragraphs[0]?.segments ?? [],
                            undefined,
                        )
                      : input === undefined
                        ? undefined
                        : new Token(input.toString(), Sym.Words);

            if (replacement instanceof Token)
                replacements.push([this, replacement]);

            return replacement;
        }
        // Not a placeholder or a declared input: nothing to substitute. Word-list
        // terms (`$term`) are expanded upstream by resolveTerms; glossary terms
        // are `@term` (resolved by ConceptLink).
        else return undefined;
    }

    getDescriptionInputs() {
        return {
            name: this.id,
        };
    }

    toText() {
        return this.toWordplay();
    }
}

import { docToMarkup } from '#locale/LocaleText.ts';
import { entriesOf } from '#util/nullable.ts';
import { withoutAnnotations } from '#locale/withoutAnnotations.ts';
import type Context from '#nodes/Context.ts';
import NameToken from '#nodes/NameToken.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import NameType from '#nodes/NameType.ts';
import type Node from '#nodes/Node.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import { PLACEHOLDER_SYMBOL } from '#parser/Symbols.ts';
import type Locales from '#locale/Locales.ts';
import type Markup from '#nodes/Markup.ts';
import type { MarkupSource } from '#nodes/Markup.ts';
import type { CharacterName } from '../tutorial/Tutorial';
import Concept from '#concepts/Concept.ts';
import type { PurposeType } from '#concepts/Purpose.ts';

export default class NodeConcept extends Concept {
    readonly template: Node;

    constructor(
        purpose: PurposeType,
        type: StructureDefinition | undefined,
        template: Node,
        context: Context,
    ) {
        super(purpose, type, context);

        this.template = template;
    }

    getCharacter(locales: Locales) {
        return this.template.getCharacter(locales);
    }

    /** Returns the emotions for the characters */
    getEmotion(locales: Locales) {
        return locales.getTextStructure(this.template.getLocalePath()).emotion;
    }

    /** Nodes can be matched by two names: the locale-specific one or the key in the locale
     * (e.g., FunctionDefinition, Evaluate).
     */
    hasName(name: string, locales: Locales): boolean {
        if (this.template.getDescriptor() === name) return true;

        const match = locales
            .getLocales()
            .map((locale) =>
                entriesOf(locale.node).find(
                    ([key]) => key === this.template.getDescriptor(),
                ),
            )
            .find((node) => node !== undefined);

        return match ? match[0] === name || match[1].name === name : false;
    }

    getDocs(locales: Locales): Markup[] {
        const path = this.template.getLocalePath();
        // Same reason as getDocLocales: report where the text lives so it can be edited where
        // it's read. A node's doc is built here rather than there, so it stamps its own.
        const source: MarkupSource = {
            accessor: (l) => path(l).doc,
            inputs: {},
        };
        return locales
            .getLocales()
            .map((l) => path(l))
            .map((text) =>
                docToMarkup(text.doc)
                    .concretize(locales, {})
                    ?.withSource(source),
            )
            .filter((m) => m !== undefined);
    }

    getName(locales: Locales, symbolic: boolean) {
        return symbolic
            ? this.template.getCharacter(locales).symbols
            : this.template.getLabel(locales);
    }

    getNames(locales: Locales, symbolic: boolean) {
        return symbolic
            ? [this.template.getCharacter(locales).symbols]
            : [this.template.getLabel(locales)];
    }

    getRepresentation(locales: Locales): Node {
        // Find any names that use _ as a placeholder and replace them with a localized name for name.
        const name = this.template.nodes(
            (n): n is Token =>
                n instanceof Token &&
                n.isSymbol(Sym.Name) &&
                n.getText() === PLACEHOLDER_SYMBOL,
        )[0];
        const nameTranslation = String(
            locales.getWithAnnotations((l) => l.node.Name.name),
        );
        const template = name
            ? this.template.replace(
                  name,
                  NameToken(
                      this.template instanceof StructureDefinition ||
                          this.template instanceof NameType
                          ? nameTranslation
                                .charAt(0)
                                .toLocaleUpperCase(locales.getLocaleString()) +
                                nameTranslation.slice(1)
                          : nameTranslation,
                  ),
              )
            : this.template;
        return template;
    }

    getNodes(): Set<Node> {
        return new Set([this.template]);
    }

    getText(): Set<string> {
        return new Set();
    }

    getSubConcepts(): Set<Concept> {
        return new Set();
    }

    getCharacterName(locales: Locales): CharacterName | undefined {
        // Get the locale strings for the template for this node.
        const text = locales.getTextStructure(this.template.getLocalePath());
        // Find the corresponding node text in the locales.
        const match = locales
            .getLocales()
            .map((l) =>
                entriesOf(l.node).find(
                    ([, t]) =>
                        withoutAnnotations(t.name) ===
                        withoutAnnotations(text.name),
                ),
            )
            .find((n) => n !== undefined);
        return match ? match[0] : undefined;
    }

    isEqualTo(concept: Concept) {
        return (
            concept instanceof NodeConcept &&
            concept.template.isEqualTo(this.template)
        );
    }
}

import type ConceptIndex from '@concepts/ConceptIndex';
import { HowToIDs, type HowToID } from '@concepts/HowTo';
import type Conflict from '@conflicts/Conflict';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import DefaultLocale from '@locale/DefaultLocale';
import { getTermDefinition } from '@locale/Glossary';
import type Locales from '@locale/Locales';
import type { TemplateInput } from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import TermRef from '@locale/TermRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { Purpose } from '@concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import { LINK_SYMBOL } from '@parser/Symbols';
import { getCodepointFromString } from '@unicode/getCodepoint';
import type Context from '@nodes/Context';
import Content from '@nodes/Content';
import type Markup from '@nodes/Markup';
import { node, type Field, type Replacement } from '@nodes/Node';
import Symbol from '@nodes/Sym';
import Token from '@nodes/Token';

/** True if the given locale entry (a NameAndDoc-like object) has a name or names field
 * that includes the given name, ignoring write-status annotations. */
function entryHasName(entry: unknown, name: string): boolean {
    if (entry === null || typeof entry !== 'object') return false;
    const names =
        'names' in entry ? entry.names : 'name' in entry ? entry.name : undefined;
    const list =
        typeof names === 'string' ? [names] : Array.isArray(names) ? names : [];
    return list.some(
        (n) => typeof n === 'string' && withoutAnnotations(n) === name,
    );
}

/** All the names by which properties of the given locale section entry can be referenced:
 * its canonical keys, plus each property's localized names. Runtime concept resolution
 * matches localized names (ConceptIndex.getSubConceptByName → Names.hasName), so
 * validity must accept them too. */
export function getConceptPropertyNames(sectionEntry: unknown): string[] {
    if (sectionEntry === null || typeof sectionEntry !== 'object') return [];
    const names: string[] = [];
    for (const [key, value] of Object.entries(sectionEntry)) {
        names.push(key);
        if (value !== null && typeof value === 'object') {
            const entryNames =
                'names' in value
                    ? value.names
                    : 'name' in value
                      ? value.name
                      : undefined;
            const list =
                typeof entryNames === 'string'
                    ? [entryNames]
                    : Array.isArray(entryNames)
                      ? entryNames
                      : [];
            for (const n of list)
                if (typeof n === 'string') names.push(withoutAnnotations(n));
        }
    }
    return names;
}

/** True if any property entry of the given locale section entry has a localized name matching the given property. */
function hasLocalizedProperty(sectionEntry: unknown, property: string): boolean {
    if (sectionEntry === null || typeof sectionEntry !== 'object') return false;
    return Object.values(sectionEntry).some((entry) =>
        entryHasName(entry, property),
    );
}

// Valid concept references are:
// 1) any input, output, basis, or node key in the locale.
// 2) a UI key in the locale.
// 3) a Unicode codepoint in the reserved `U` namespace (e.g. @U/1F600).
// 4) the name of a custom character

export const ReservedConceptIDs = new Set([
    ...Object.keys(DefaultLocale.node),
    ...Object.keys(DefaultLocale.basis),
    ...Object.keys(DefaultLocale.input),
    ...Object.keys(DefaultLocale.output),
]);

/** Glossary term ids referenceable as `@term` (lowercase). Concept ids take
 *  precedence, so a `@id` resolves to a glossary term only when it isn't a
 *  concept id. */
export const ReservedGlossaryIDs = new Set(Object.keys(DefaultLocale.glossary));

export class ConceptName {
    readonly name: string;
    readonly property: string | undefined;

    constructor(name: string, property?: string) {
        this.name = name;
        this.property = property;
    }
}

export class CodepointName {
    readonly codepoint: string;

    constructor(codepoint: string) {
        this.codepoint = codepoint;
    }
}

export class UIName {
    readonly id: string;

    constructor(id: string) {
        this.id = id;
    }
}

export class HowToName {
    readonly name: string;

    constructor(id: string) {
        this.name = id;
    }
}

/** A `@term` reference (lowercase id) that resolves to a glossary entry rather
 *  than a documented concept. */
export class GlossaryName {
    readonly id: string;

    constructor(id: string) {
        this.id = id;
    }
}

export class CharacterName {
    readonly username: string;
    readonly name: string;

    constructor(username: string, name: string) {
        this.username = username;
        this.name = name;
    }
}

export default class ConceptLink extends Content {
    readonly concept: Token;

    constructor(concept: Token) {
        super();

        this.concept = concept;
    }

    static make(concept: string) {
        return new ConceptLink(
            new Token(`${LINK_SYMBOL}${concept}`, Symbol.Concept),
        );
    }

    /** Complete the concept link being edited (e.g. `@Col`, `@Color.ra`) against
     *  the concept index and the available custom characters, filtered by what's
     *  already typed — mirroring how reference completion narrows by prefix. */
    static getPossibleReplacements({
        node,
        concepts,
        characters,
        locales,
    }: ReplaceContext) {
        if (!(node instanceof ConceptLink)) return [];
        const prefix = node.getName();
        return [
            ...(concepts
                ? getConceptLinkCompletions(concepts, locales, prefix)
                : []),
            ...getCharacterLinkCompletions(characters, prefix),
        ];
    }

    static getPossibleInsertions({ characters }: InsertContext) {
        // Concept links complete an existing `@…` token (handled as a
        // replacement above); concepts aren't offered as fresh insertions, so the
        // markup menu isn't flooded with every concept when no link is typed.
        // Custom characters are a bounded, user-relevant set, so they are offered
        // as fresh insertions wherever markup accepts a concept link.
        return characters?.map((name) => ConceptLink.make(name)) ?? [];
    }

    getDescriptor(): NodeDescriptor {
        return 'ConceptLink';
    }

    getName() {
        return this.concept.getText().slice(1);
    }

    getCodepoint() {
        return codepointOfConceptRef(this.getName());
    }

    static parse(name: string) {
        // Split on either separator: `.` introduces a concept's member/
        // subconcept (e.g. `@Color.random`), while `/` introduces a UI
        // reference, how-to, codepoint, or character name (e.g.
        // `@username/charactername`). Classification below is by the first
        // segment, not the separator, so either separator resolves; authored
        // content uses `.` for concepts.
        const [concept, property] = name.split(/[./]/);
        if (concept.toLowerCase() === 'ui') return new UIName(property);
        if (concept.toLowerCase() === 'how') return new HowToName(property);
        // The reserved `U` namespace is a Unicode codepoint reference (e.g.
        // `@U/1F600` → 😀). An invalid codepoint (bad hex, out of range, NUL,
        // or a surrogate) is unparseable, so `isValid` reports a conflict.
        // The reserved namespaces `u`, `ui`, and `how` can never collide with
        // a creator's username, since usernames require at least 5 characters
        // (see isValidUsername).
        if (concept.toLowerCase() === 'u') {
            if (property === undefined) return undefined;
            const codepoint = getCodepointFromString(property);
            return codepoint === undefined
                ? undefined
                : new CodepointName(codepoint);
        }
        if (ReservedConceptIDs.has(concept))
            return new ConceptName(concept, property);
        // A bare `@term` (no member/separator) whose id is a glossary term, and
        // not a concept id, is a glossary reference. Concept ids take precedence.
        else if (property === undefined && ReservedGlossaryIDs.has(concept))
            return new GlossaryName(concept);
        else return new CharacterName(concept, property);
    }

    /** Is valid if it refers to a concept key in the given Locale */
    isValid(locale: LocaleText) {
        const concept = ConceptLink.parse(this.getName());
        // Couldn't parse? Not valid.
        if (concept === undefined) return false;
        // Found a UI or codepoint? Valid.
        if (
            concept instanceof UIName ||
            concept instanceof CodepointName ||
            concept instanceof CharacterName
        )
            return true;
        // A bare word like `@how` parses as a HowToName (a how-to reference uses
        // a specific id, e.g. `@phrase-how-to`), but the same word can be a
        // glossary term (`how` → "how-to"). Accept a valid how-to id OR, falling
        // back to the link's literal name, a glossary term.
        if (concept instanceof HowToName)
            return (
                HowToIDs.includes(concept.name as HowToID) ||
                this.getName() in locale.glossary
            );
        if (concept instanceof GlossaryName)
            return concept.id in locale.glossary;

        // See which section of the locale has the concept name, if any.
        const section = [
            locale.node,
            locale.input,
            locale.output,
            locale.basis,
        ].find((c) => concept.name in c);

        // Valid if we found it, and no property was specified, or it was, and the concept has it
        // by canonical key or by one of its localized names, since runtime resolution accepts both.
        if (section === undefined) return false;
        if (concept.property === undefined) return true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entry = (section as Record<string, any>)[concept.name];
        return (
            concept.property in entry ||
            hasLocalizedProperty(entry, concept.property) ||
            (section === locale.basis &&
                (concept.property in entry.function ||
                    hasLocalizedProperty(entry.function, concept.property)))
        );
    }

    getGrammar(): Field[] {
        return [
            { name: 'concept', kind: node(Symbol.Concept), label: undefined },
        ];
    }

    clone(replace?: Replacement | undefined): this {
        return new ConceptLink(
            this.replaceChild('concept', this.concept, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Documentation;
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.ConceptLink;
    getLocalePath() {
        return ConceptLink.LocalePath;
    }

    getDescriptionInputs(): Record<string, TemplateInput> {
        return { concept: this.getName() };
    }

    /**
     * A reference can resolve to several different things (see ConceptLink.parse),
     * so describe it according to what it is: a documented concept, a Unicode
     * codepoint, a UI element, a how-to, or a creator's custom character.
     */
    getDescription(locales: Locales, _: Context): Markup {
        const parsed = ConceptLink.parse(this.getName());
        if (parsed instanceof CodepointName)
            return locales.concretize(
                (l) => l.node.ConceptLink.kind.codepoint,
                {
                    concept: this.getCodepoint() ?? this.getName(),
                },
            );
        if (parsed instanceof UIName)
            return locales.concretize((l) => l.node.ConceptLink.kind.ui, {
                concept: parsed.id ?? this.getName(),
            });
        if (parsed instanceof HowToName)
            return locales.concretize((l) => l.node.ConceptLink.kind.how, {
                concept: parsed.name ?? this.getName(),
            });
        if (parsed instanceof CharacterName)
            return locales.concretize(
                (l) => l.node.ConceptLink.kind.character,
                {
                    concept: parsed.name
                        ? `${parsed.username}/${parsed.name}`
                        : parsed.username,
                },
            );
        // A glossary term: describe it with its definition.
        if (parsed instanceof GlossaryName)
            return getTermDefinition(locales, parsed.id);
        // A documented concept (with an optional member), or an unparseable
        // reference: use the default concept description.
        return locales.concretize((l) => l.node.ConceptLink.description, {
            concept:
                parsed instanceof ConceptName
                    ? parsed.property
                        ? `${parsed.name}.${parsed.property}`
                        : parsed.name
                    : this.getName(),
        });
    }

    getCharacter() {
        return Characters.Link;
    }

    concretize(locales: Locales): ConceptLink | TermRef {
        // A `@term` glossary reference resolves to a TermRef so it renders as an
        // interactive glossary link (via TermView), like an `@term` reference.
        const parsed = ConceptLink.parse(this.getName());
        if (parsed instanceof GlossaryName) {
            const word = locales.getTermByID(parsed.id);
            if (word !== undefined) return new TermRef(parsed.id, word);
        }
        return this;
    }

    toText() {
        // A `@U/<hex>` reference is a Unicode codepoint escape (a
        // CodepointName), so converting markup to plain text resolves it to its
        // character, the same as a text literal does. Other links have no
        // plain-text form, so they fall back to their source.
        return this.getCodepoint() ?? this.toWordplay();
    }
}

/** The character a concept reference (the text after `@`) resolves to, if it
 *  is a codepoint reference (e.g. `U/1F600` → 😀), and undefined otherwise.
 *  The single decode path shared by markup, text literals, and formatted
 *  literals, so codepoint resolution can't drift between them. */
export function codepointOfConceptRef(name: string): string | undefined {
    const parsed = ConceptLink.parse(name);
    return parsed instanceof CodepointName ? parsed.codepoint : undefined;
}

/** Build concept-link completions that match the partial link `prefix` (the
 *  text after `@`, e.g. `Col` or `Color.ra`):
 *
 *   - No `.` in the prefix → complete a top-level concept whose reserved id
 *     starts with the prefix (`@Col` → `@Color`).
 *   - A `.` in the prefix → complete a member of the concept named before the
 *     `.`, by the text after it (`@Color.ra` → `@Color.random`).
 *
 *  A subconcept renders as `Owner.member` (the `.` marks a concept member); the
 *  owner (or a top-level concept) must be referable by a reserved concept id so
 *  {@link ConceptLink.parse} classifies the link as a concept and it resolves
 *  regardless of the active locale. */
function getConceptLinkCompletions(
    concepts: ConceptIndex,
    locales: Locales,
    prefix: string,
): ConceptLink[] {
    const dot = prefix.indexOf('.');
    const ownerText = (dot >= 0 ? prefix.slice(0, dot) : prefix).toLowerCase();
    const memberPrefix =
        dot >= 0 ? prefix.slice(dot + 1).toLowerCase() : undefined;

    const seen = new Set<string>();
    const links: ConceptLink[] = [];
    for (const concept of concepts.concepts) {
        const owner = concepts.getConceptOwner(concept);
        const id = (owner ?? concept)
            .getNames(locales, false)
            .find((name) => ReservedConceptIDs.has(name));
        if (id === undefined) continue;
        let token: string;
        if (memberPrefix !== undefined) {
            // Completing a member: the owner must match exactly, the member by prefix.
            if (owner === undefined || id.toLowerCase() !== ownerText) continue;
            const member = concept.getName(locales, false);
            if (
                member.length === 0 ||
                !member.toLowerCase().startsWith(memberPrefix)
            )
                continue;
            token = `${id}.${member}`;
        } else {
            // Completing a top-level concept by prefix.
            if (owner !== undefined || !id.toLowerCase().startsWith(ownerText))
                continue;
            token = id;
        }
        if (seen.has(token)) continue;
        seen.add(token);
        links.push(ConceptLink.make(token));
    }
    return links;
}

/** Build character-link completions whose name (`username/charactername`)
 *  starts with the partial link `prefix` (the text after `@`). */
function getCharacterLinkCompletions(
    characters: string[] | undefined,
    prefix: string,
): ConceptLink[] {
    if (characters === undefined) return [];
    const lower = prefix.toLowerCase();
    return characters
        .filter((name) => name.toLowerCase().startsWith(lower))
        .map((name) => ConceptLink.make(name));
}

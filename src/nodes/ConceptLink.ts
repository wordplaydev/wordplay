import type ConceptIndex from '@concepts/ConceptIndex';
import { isTourID } from '@components/project/tours';
import { HowToIDs, type HowToID } from '@concepts/HowTo';
import type Conflict from '@conflicts/Conflict';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import DefaultLocale from '@locale/DefaultLocale';
import {
    foldGlossaryForm,
    getGlossaryFormIndex,
    getTermDefinition,
    type GlossaryFormIndex,
} from '@locale/Glossary';
import { findConceptEntry } from '@locale/getConceptName';
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
        'names' in entry
            ? entry.names
            : 'name' in entry
              ? entry.name
              : undefined;
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
            // A grouping dictionary of statics — Instrument.instruments,
            // Color.colors, Music.scales — holds referenceable names one level
            // down; see `hasGroupedProperty` for how one is recognized.
            if (
                !Array.isArray(value) &&
                !('names' in value) &&
                !('name' in value) &&
                !('doc' in value)
            )
                names.push(...getConceptPropertyNames(value));
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
function hasLocalizedProperty(
    sectionEntry: unknown,
    property: string,
): boolean {
    if (sectionEntry === null || typeof sectionEntry !== 'object') return false;
    return Object.values(sectionEntry).some((entry) =>
        entryHasName(entry, property),
    );
}

/**
 * True if a *grouping* sub-object of a locale entry has the property, by key or
 * by localized name.
 *
 * Statics live one level deeper than inputs do — an instrument at
 * `output.Instrument.instruments.voice`, a colour at `output.Color.colors.red`,
 * a scale at `output.Music.scales.major`, a basis function at
 * `basis.X.function.y` — even though `StructureConcept` exposes them as
 * subconcepts and the renderer resolves `@Instrument/voice` perfectly well. Only
 * this check couldn't see them, so every such link read as an unknown concept.
 *
 * A grouping object is recognized by its entries having no `names`/`name`/`doc`
 * of their own: it is a dictionary of documented things rather than a documented
 * thing itself. That distinction is what keeps `@Color/doc` invalid.
 */
function hasGroupedProperty(sectionEntry: unknown, property: string): boolean {
    if (sectionEntry === null || typeof sectionEntry !== 'object') return false;
    return Object.values(sectionEntry).some(
        (group) =>
            group !== null &&
            typeof group === 'object' &&
            !Array.isArray(group) &&
            !('names' in group) &&
            !('name' in group) &&
            !('doc' in group) &&
            (property in group || hasLocalizedProperty(group, property)),
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

/** A `@Tour/<id>` reference to one of the interface tours, which renders as a
 *  control that starts it. The tutorial uses these to hand a learner to the
 *  tour that teaches a part of the interface, rather than describing it. */
export class TourName {
    /** Not narrowed to a TourID: an unknown id must still parse as a tour
     *  reference so `isValid` can report the typo, rather than falling through
     *  to a custom character reference, which is valid by construction (a
     *  creator's characters aren't known at check time) and so reports nothing. */
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
    /** The reference as written, when it matched one of the active locale's own
     *  forms — the whole word is then displayed as written, so "parameters"
     *  reads as one link. Undefined when the reference was the term's id or
     *  canonical word, or when only the en-US fallback matched, in which case
     *  the locale's canonical word is displayed instead. */
    readonly form: string | undefined;

    constructor(id: string, form?: string) {
        this.id = id;
        this.form = form;
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
        // Defer to parse() so a reserved concept name that also reads as hex
        // (e.g. `Face` = 0xFACE) is treated as the concept, not a codepoint.
        const parsed = ConceptLink.parse(this.getName());
        return parsed instanceof CodepointName ? parsed.codepoint : undefined;
    }

    /**
     * Classify a reference's name. `forms` is the glossary form index to resolve
     * inflected references against; it defaults to en-US's, since callers that
     * are locale-free by design (plain-text output, character references, the
     * editor's inline glyphs) must still classify a reference the same way the
     * guide does, or the same text would render as a glossary term in one place
     * and a broken custom character in another.
     */
    static parse(
        name: string,
        forms: GlossaryFormIndex = getGlossaryFormIndex(DefaultLocale),
    ) {
        // Split on either separator: `.` introduces a concept's member/
        // subconcept (e.g. `@Color.random`), while `/` introduces a UI
        // reference, how-to, or character name (e.g. `@username/charactername`).
        // Classification below is by the first segment, not the separator, so
        // either separator resolves; authored content uses `.` for concepts.
        const [concept, property] = name.split(/[./]/);
        if (concept.toLowerCase() === 'ui') return new UIName(property);
        // Only with an id, for the same reason as `how` below: a bare `@tour`
        // should stay available as an ordinary word.
        if (concept.toLowerCase() === 'tour' && property !== undefined)
            return new TourName(property);
        // Only with an id: a bare `@how` is the glossary term "how-to", and
        // classifying it as a how-to reference left it resolving to nothing and
        // rendering as the literal text `@how` in every locale that uses it.
        if (concept.toLowerCase() === 'how' && property !== undefined)
            return new HowToName(property);
        // A reserved concept id wins over a hex-codepoint reading, so a concept
        // whose name happens to be all hex digits (e.g. `Face` = 0xFACE) links
        // to the concept instead of rendering the unassigned codepoint U+FACE.
        if (ReservedConceptIDs.has(concept))
            return new ConceptName(concept, property);
        // The reserved `U` namespace is a Unicode codepoint reference (e.g.
        // `@U/1F600` → 😀). An invalid codepoint (bad hex, out of range, NUL,
        // or a surrogate) is unparseable, so `isValid` reports a conflict.
        // The reserved namespaces `u`, `ui`, `how`, and `tour` can never collide
        // with a creator's username, since usernames require at least 5
        // characters (see isValidUsername).
        if (concept.toLowerCase() === 'u') {
            if (property === undefined) return undefined;
            const codepoint = getCodepointFromString(property);
            return codepoint === undefined
                ? undefined
                : new CodepointName(codepoint);
        }
        // A bare `@term` (no member/separator) whose id is a glossary term, and
        // not a concept id, is a glossary reference. Concept ids take precedence.
        if (property === undefined && ReservedGlossaryIDs.has(concept))
            return new GlossaryName(concept);
        // Otherwise, one of the locale's written forms of a term — a plural,
        // conjugation, or synonym (e.g. `@parameters`), matched ignoring case so
        // a sentence-initial reference works. A form of this locale's own
        // displays as written; one matched only through the en-US fallback
        // displays the locale's canonical word.
        if (property === undefined) {
            const match = forms.get(foldGlossaryForm(concept));
            if (match !== undefined)
                return new GlossaryName(
                    match.id,
                    match.native ? concept : undefined,
                );
        }
        return new CharacterName(concept, property);
    }

    /**
     * Whether this reference can never resolve to anything.
     *
     * `parse` classifies anything it doesn't recognize as a character reference,
     * and `isValid` accepts those, since a creator's characters aren't known at
     * check time. But a character is looked up as `username/charactername`
     * (see `CharacterView`), so a *bare* one — no character name — has nothing
     * to find: not a concept, not a glossary term or form, not a codepoint, not
     * a character. It renders as the unknown-character glyph.
     *
     * This is what the locale verifier checks. `isValid` can't: it returns true
     * for exactly these (#1245).
     */
    isBroken(locale: LocaleText) {
        const parsed = ConceptLink.parse(
            this.getName(),
            getGlossaryFormIndex(locale),
        );
        return parsed instanceof CharacterName && parsed.name === undefined;
    }

    /** Is valid if it refers to a concept key in the given Locale */
    isValid(locale: LocaleText) {
        const concept = ConceptLink.parse(
            this.getName(),
            getGlossaryFormIndex(locale),
        );
        // Couldn't parse? Not valid.
        if (concept === undefined) return false;
        // Found a UI or codepoint? Valid.
        if (
            concept instanceof UIName ||
            concept instanceof CodepointName ||
            concept instanceof CharacterName
        )
            return true;
        // Unlike a custom character, every tour is known at check time, so a
        // reference to one that doesn't exist is a conflict rather than a
        // link that quietly renders as nothing.
        if (concept instanceof TourName) return isTourID(concept.id);
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

        // See which section of the locale has the concept name, if any. Shared
        // with `getConceptNameById`, which reads the name a link displays where
        // there is no ConceptIndex — a link that validates here but whose name
        // can't be found there would render as its raw English id.
        const entry = findConceptEntry(locale, concept.name);

        // Valid if we found it, and no property was specified, or it was, and the concept has it
        // by canonical key or by one of its localized names, since runtime resolution accepts both.
        if (entry === undefined) return false;
        if (concept.property === undefined) return true;
        return (
            concept.property in entry ||
            hasLocalizedProperty(entry, concept.property) ||
            // Subsumes the old `basis.*.function` special case, which was the
            // same "look one level deeper" idea written for one section only.
            hasGroupedProperty(entry, concept.property)
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
        const parsed = ConceptLink.parse(
            this.getName(),
            locales.getGlossaryForms(),
        );
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
        if (parsed instanceof TourName)
            return locales.concretize((l) => l.node.ConceptLink.kind.tour, {
                concept: parsed.id,
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
        const parsed = ConceptLink.parse(
            this.getName(),
            locales.getGlossaryForms(),
        );
        if (parsed instanceof GlossaryName)
            return getTermRef(locales, parsed) ?? this;
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

/**
 * The `TermRef` a resolved glossary reference renders as, or undefined if the
 * locale has no such term. A reference that matched one of the active locale's
 * own forms displays the form as written, so an inflected word like
 * "parameters" is one whole highlighted link; a reference resolved through the
 * en-US fallback displays this locale's canonical word, so a translated string
 * that kept an English reference verbatim reads exactly as it does today.
 */
export function getTermRef(
    locales: Locales,
    parsed: GlossaryName,
): TermRef | undefined {
    const word = parsed.form ?? locales.getTermByID(parsed.id);
    return word === undefined ? undefined : new TermRef(parsed.id, word);
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

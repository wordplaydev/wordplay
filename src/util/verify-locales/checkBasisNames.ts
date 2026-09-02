import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import Input from '@nodes/Input';
import Source from '@nodes/Source';
import { buildKeywordIndex, Keywords } from '@parser/Keywords';
import createDefaultShares from '@runtime/createDefaultShares';
import type Log from '@util/verify-locales/Log';

/**
 * Three locale-data hazards that silently change what a program *means*, all
 * invisible to every other check because each produces a program that still
 * parses and often still type-checks.
 *
 * 1. **Two members of one basis type sharing a name.** Nothing verifies this —
 *    `checkGlobalNames` does exactly this shape of check but only over
 *    `createDefaultShares` globals and `↑` statics, never `basis.<Type>.*`. A
 *    reference respelled with the shared word binds to whichever member the
 *    basis declares first, so ko-KR's one word for `join` and `combine` made
 *    `combine(…)` call `join(…)`, and the type error surfaced somewhere else
 *    entirely.
 * 2. **A symbolic name belonging to a different function.** sr-RS gave
 *    `notequals` the glyph `=` on nine basis types, so every rewritten program
 *    compared for equality where its source compared for inequality — with the
 *    same conflict count, so no analysis could catch it. Four shipped example
 *    files carried inverted logic.
 * 3. **A member name equal to a keyword word that lexes anywhere.** The
 *    tokenizer gives such a word both `Sym.Name` and the keyword's own symbol
 *    and lets the parser choose by position, so hi-IN naming `Group.face`
 *    `रूप` — also its word for `convert` — made `रूप: "Aclonica"` parse as an
 *    infix `→`. Only keywords that can win at an expression boundary matter;
 *    pattern-context words lex solely inside `⣿…⣿`, and the operator words
 *    (`and`/`or`/`not`) leave a name perfectly usable.
 *
 * All three are pure data checks, so `npm run locales` catches them before any
 * translate run spends money on a file that can't be written.
 */
export default function checkBasisNames(log: Log, locale: LocaleText): void {
    checkDuplicateMemberNames(log, locale);
    checkSymbolicNames(log, locale);
    checkKeywordShadowing(log, locale);
}

/** Every `names` value under a basis type, as `[memberPath, names[]]`. */
function membersOf(locale: LocaleText, type: string): [string, string[]][] {
    const basis = locale.basis as unknown as Record<string, unknown>;
    const typeValue = basis[type];
    if (typeValue === null || typeof typeValue !== 'object') return [];
    const members: [string, string[]][] = [];
    for (const [group, groupValue] of Object.entries(
        typeValue as Record<string, unknown>,
    )) {
        // Only the member groups hold definitions with their own names;
        // `name`/`doc` describe the type itself.
        if (
            groupValue === null ||
            typeof groupValue !== 'object' ||
            (group !== 'function' && group !== 'conversion')
        )
            continue;
        for (const [member, memberValue] of Object.entries(
            groupValue as Record<string, unknown>,
        )) {
            if (memberValue === null || typeof memberValue !== 'object')
                continue;
            const names = (memberValue as Record<string, unknown>).names;
            const list =
                typeof names === 'string'
                    ? [names]
                    : Array.isArray(names)
                      ? names.filter((n): n is string => typeof n === 'string')
                      : [];
            if (list.length > 0) members.push([`${group}.${member}`, list]);
        }
    }
    return members;
}

/** A locale's declared name, without its write-status annotation. Names are
 *  comma-separated in some locales, so each part counts separately. */
function namesIn(values: string[]): string[] {
    return values.flatMap((value) =>
        withoutAnnotations(value)
            .split(',')
            .map((part) => part.trim())
            .filter((part) => part.length > 0),
    );
}

function basisTypes(locale: LocaleText): string[] {
    return Object.keys(locale.basis as unknown as Record<string, unknown>);
}

/** Two different members of one basis type must not share a name. */
function checkDuplicateMemberNames(log: Log, locale: LocaleText): void {
    for (const type of basisTypes(locale)) {
        const byName = new Map<string, Set<string>>();
        for (const [member, values] of membersOf(locale, type))
            for (const name of namesIn(values)) {
                const holders = byName.get(name) ?? new Set<string>();
                holders.add(member);
                byName.set(name, holders);
            }
        for (const [name, holders] of byName) {
            if (holders.size < 2) continue;
            log.bad(
                `basis.${type}: "${name}" names ${holders.size} different members (${[...holders].join(', ')}). A reference spelled that way binds to whichever the basis declares first, so give each member its own name.`,
            );
        }
    }
}

/**
 * A member's symbolic name must be the same glyph en-US gives it. A locale may
 * legitimately add or drop a word alias, but the operator glyph *is* the
 * function; handing one function another's glyph inverts programs silently.
 */
function checkSymbolicNames(log: Log, locale: LocaleText): void {
    const symbolic = (values: string[]) =>
        namesIn(values).filter((name) => !/\p{L}/u.test(name));

    for (const type of basisTypes(locale)) {
        const english = new Map(membersOf(DefaultLocale, type));
        // Every glyph en-US uses in this type, so we can say whose it is.
        const owners = new Map<string, string>();
        for (const [member, values] of english)
            for (const glyph of symbolic(values))
                if (!owners.has(glyph)) owners.set(glyph, member);

        for (const [member, values] of membersOf(locale, type)) {
            const expected = new Set(symbolic(english.get(member) ?? []));
            for (const glyph of symbolic(values)) {
                if (expected.has(glyph)) continue;
                const owner = owners.get(glyph);
                if (owner === undefined || owner === member) continue;
                log.bad(
                    `basis.${type}.${member} is named "${glyph}", which is en-US's symbol for ${owner}. A program using it would silently mean ${owner}; use ${[...expected].join('/') || 'the symbol en-US gives this member'}.`,
                );
            }
        }
    }
}

/**
 * No input may be named a word that stops parsing as an input name.
 *
 * Decided by **parsing real signatures**, not by a list of dangerous
 * keywords: the tokenizer gives a keyword word both `Sym.Name` and the
 * keyword's own symbol and lets the parser choose by position, so which words
 * are dangerous is a property of the grammar, and *where* they are dangerous
 * is a property of the definition. hi-IN naming `Group.face` `रूप` (its word
 * for `convert`) makes `रूप: "Aclonica"` parse as an infix `→`; as-IN naming
 * `Bubble.kind` its word for `type` makes the call an `Is`.
 *
 * Position is what separates a hazard from a false alarm. An infix reading
 * needs a complete expression to its left, so only an input that can *follow*
 * another argument is at risk — which is why en-US's own
 * `Sequence.slideout(to: …)` is fine (`to` is that function's first input and
 * also its word for `translate`) while `Bubble(… kind: …)` is not. Each input
 * is therefore probed in the position it actually occupies.
 */
function checkKeywordShadowing(log: Log, locale: LocaleText): void {
    const keywords = new Set<string>();
    const block = locale.keyword as unknown as Record<string, unknown>;
    for (const id of Object.keys(Keywords)) {
        const word = block[id];
        if (typeof word !== 'string') continue;
        const plain = withoutAnnotations(word).trim();
        if (plain.length > 0) keywords.add(plain);
    }
    if (keywords.size === 0) return;

    // The locale's own definitions, so inputs come with their real order.
    // A name that isn't a valid identifier makes this throw; checkGlobalNames
    // reports that, so stay quiet here rather than reporting it twice.
    let shares;
    try {
        shares = createDefaultShares(
            new Locales(concretize, [locale], locale),
        ).all;
    } catch {
        return;
    }

    const index = buildKeywordIndex([locale.keyword]);
    const reported = new Set<string>();
    for (const definition of shares) {
        const inputs = definition.inputs;
        if (inputs === undefined) continue;
        for (let position = 0; position < inputs.length; position++) {
            // Nothing can precede a first input, so no infix reading is
            // available to beat it.
            if (position === 0) continue;
            for (const name of inputs[position].names.getNames()) {
                if (!keywords.has(name) || reported.has(name)) continue;
                // The shape this input is actually written in: one argument
                // before it, so an infix reading is available to win.
                const parses = new Source('probe', `f(1 ${name}: 2)`, index)
                    .nodes()
                    .some(
                        (node) =>
                            node instanceof Input &&
                            node.name.getText() === name,
                    );
                if (parses) continue;
                reported.add(name);
                // A warning, not an error, and deliberately so: the twelve
                // locales that name `Bubble.kind` with their word for `type`
                // have no second alias to promote, so clearing this needs
                // either a fresh word in twelve languages or a parser change
                // (preferring the name reading when a `:` follows, which
                // would retire the hazard everywhere at once). Both are
                // decisions to make deliberately rather than a repair to
                // apply, and failing the build meanwhile would only tempt
                // someone to invent twelve words in a hurry.
                log.warning(
                    `${definition.names.getNames()[0]}'s input "${name}" is also one of this locale's keyword words, so \`${name}: …\` stops parsing as an input when anything precedes it and the evaluation becomes something else. Rename the input or the keyword.`,
                );
            }
        }
    }
}

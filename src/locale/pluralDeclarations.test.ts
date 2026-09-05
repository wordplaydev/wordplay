import DefaultLocale from '@locale/DefaultLocale';
import { getPluralCount } from '@locale/plurals';
import {
    checkPluralBranches,
    getDeclaredInputs,
    getPluralBranches,
} from '@locale/templateInputs';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import { expect, test } from 'vitest';

/** Every en-US string with its dotted locale path. */
function enUSStrings(): { path: string; value: string }[] {
    return getKeyTemplatePairs(
        DefaultLocale as unknown as Record<string, unknown>,
    )
        .map((pair) => ({
            path: pair.toString(),
            value: pair.value,
        }))
        .filter(
            (pair): pair is { path: string; value: string } =>
                typeof pair.value === 'string',
        );
}

test('every declared count chooses a plural form in en-US', () => {
    // The declaration is the contract: marking an input `#name` says the
    // sentence changes with the number, so the source string has to say how.
    // This is what stops the next count-bearing string from shipping as
    // "1 values" — the whole point of the machinery.
    const forms = getPluralCount(DefaultLocale.language);
    const problems: string[] = [];
    for (const { path, value } of enUSStrings()) {
        const check = checkPluralBranches(path, value, forms);
        if (check === undefined) continue;
        for (const arity of check.arity)
            problems.push(
                `${path}: $#${arity.name} has ${arity.found} form(s), en-US needs ${arity.expected}`,
            );
        for (const name of check.missing)
            problems.push(`${path}: $${name} is a count but chooses no form`);
    }
    expect(problems).toEqual([]);
});

test('every plural branch in en-US names a declared count', () => {
    // The other direction: a `$#name` the schema doesn't declare as a count
    // would never be checked per locale, so it would drift silently.
    const declared = getDeclaredInputs();
    const problems: string[] = [];
    for (const { path, value } of enUSStrings()) {
        for (const branch of getPluralBranches(value)) {
            const names = declared.get(path) ?? [];
            if (!names.includes(`#${branch.name}`))
                problems.push(
                    `${path}: $#${branch.name} is not declared as '#${branch.name}'`,
                );
        }
    }
    expect(problems).toEqual([]);
});

/**
 * Count-like inputs that stand alone, with no noun whose form they change —
 * "match 1 of 3", "2 selected", "and 3 more". These read correctly at every
 * value, so they need no plural forms. Listed rather than inferred: a new
 * count-bearing string has to be either declared `#name` or added here with a
 * reason, so "1 values" can't reappear by omission.
 */
const NounlessCounts = new Set([
    // "documentation list of 3" — the noun is the list, not the count.
    'node.Docs.description',
    // "matched 3 — enough to keep going": a number of times, no noun.
    'node.PatternLiteral.step.repeat',
    'node.PatternLiteral.step.short',
    // "match 1 of 3"
    'ui.feedback.searchMatch',
    // "cat selected, 2 selected"
    'ui.output.selected',
    'ui.output.deselected',
    'ui.output.allSelected',
    // "and 3 more", "Showing 12 — search to find more"
    'ui.emoji.moreLanguages',
    'ui.emoji.moreGlyphs',
    // "track 2 of 3" — both numbers count the same noun, which is already
    // named ahead of them and never inflects.
    'ui.palette.music.track',
    // "music 2" — which music, not how many, so it is an ordinal label.
    'ui.palette.music.unnamed',
    // "undid step 3 of 12", "layer 2 of 5" — both numbers count the same noun,
    // which is named ahead of them and never inflects.
    'ui.page.character.announce.undone',
    'ui.page.character.announce.redone',
    'ui.page.character.announce.arranged',
]);

test('no en-US string interpolates a count without a plural form', () => {
    // A count declared without the marker is the same bug wearing a disguise:
    // it renders "1 values" and nothing checks it. Any new count-bearing input
    // has to be declared '#name', which the two tests above then enforce.
    const suspicious: string[] = [];
    for (const { path } of enUSStrings()) {
        if (NounlessCounts.has(path)) continue;
        const names = getDeclaredInputs().get(path);
        if (names === undefined) continue;
        for (const name of names)
            if (
                !name.startsWith('#') &&
                /^(count|total|words|lines)$/.test(name)
            )
                suspicious.push(`${path}: $${name}`);
    }
    expect(suspicious).toEqual([]);
});

/**
 * The text between a `$#name[` and its matching `]`, for each plural branch.
 *
 * getPluralBranches counts arms but reports no offsets, so the arms have to be
 * found again here — with the same bracket matching, including its rule that a
 * doubled delimiter is an escaped literal rather than structure.
 */
function pluralArmText(template: string): { name: string; arms: string }[] {
    const found: { name: string; arms: string }[] = [];
    for (const match of template.matchAll(/(?<!\$)\$#([a-zA-Z0-9]+)\[/g)) {
        const from = match.index + match[0].length;
        let depth = 1;
        let i = from;
        for (; i < template.length; i++) {
            const c = template[i];
            if (
                (c === '[' || c === ']' || c === '|') &&
                template[i + 1] === c
            ) {
                i++;
                continue;
            }
            if (c === '[') depth++;
            else if (c === ']') {
                depth--;
                if (depth === 0) break;
            }
        }
        found.push({ name: match[1] ?? '', arms: template.slice(from, i) });
    }
    return found;
}

test('the arm extractor finds what it should', () => {
    // This test exists because the check below was written once with offsets
    // getPluralBranches does not return, which made it compare the whole string
    // against itself and silently pass on the very bug it was added for.
    expect(
        pluralArmText('list of $#count[$count value|$count values]'),
    ).toEqual([{ name: 'count', arms: '$count value|$count values' }]);
    expect(pluralArmText('be $#age[/one year/|/# years/] old')).toEqual([
        { name: 'age', arms: '/one year/|/# years/' },
    ]);
    expect(pluralArmText('no branches here')).toEqual([]);
});

test('every plural branch in en-US actually shows its count', () => {
    // A count is declared because the sentence changes with the number, which
    // almost always means the number is *in* the sentence. Writing a literal
    // `#` inside an arm — as if it were a placeholder — reads perfectly in the
    // JSON and renders as a bare `#` to the creator, which is how
    // `$#age[/one year/|/# years/]` shipped to a review as "# years old".
    //
    // Both `$name` and `$#name` interpolate inside an arm, so either satisfies
    // this. What it catches is an arm that mentions the count in neither form
    // while still containing a digit-shaped placeholder.
    const problems: string[] = [];
    for (const { path, value } of enUSStrings())
        for (const { name, arms } of pluralArmText(value)) {
            const shows =
                arms.includes(`$${name}`) || arms.includes(`$#${name}`);
            // An arm may legitimately spell the number out ("one year"), so a
            // branch that never interpolates is only wrong when it looks like
            // it meant to: a stray `#` is the tell.
            if (!shows && arms.includes('#'))
                problems.push(
                    `${path}: $#${name}'s arms contain "#" but never interpolate the count — write $${name}`,
                );
        }
    expect(problems, problems.join('\n')).toEqual([]);
});

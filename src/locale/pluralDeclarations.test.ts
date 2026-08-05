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

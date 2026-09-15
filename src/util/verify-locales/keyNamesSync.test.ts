import { expect, test } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { isRecord, isStringArray } from '@util/guards';
import { withoutAnnotations } from '@locale/withoutAnnotations';

/**
 * A key is named what its keycap says, and a function key's cap says `F1`.
 *
 * @sweep static/locales Reads every locale's key-name table, which grows with the
 * corpus rather than with the code under test.
 *
 * Machine translation collapses homographs, and `input.Key.keys` is where that
 * does the most damage, because these values are what `Key()` reports into a
 * creator's program as well as what the shortcut list prints. Six locales had
 * transliterated the function keys into their own script — Gujarati `એફ 1`,
 * Serbian `Ф1`, Telugu `ఎఫ్1` — and Gujarati had transliterated the *digit* too
 * (`એફ૩`). No keyboard anywhere prints those, so a creator could look at the key
 * under their finger and never find it in the list.
 *
 * Only the function keys are checked here, because only they are answerable
 * without knowing the language: F1–F12 are printed identically on every keyboard
 * on earth. The rest of the table has the same problem — French said "S'échapper"
 * for Escape, Korean "탈출하다", Polish "Ucieczka", all of them the verb *to flee*
 * — but naming those correctly takes a speaker of the language, so they are left
 * for review rather than guessed at here.
 */
const LocalesDirectory = 'static/locales';

/** Each locale's key-name table, by locale code. Built by pushing rather than
 *  mapping so the tuple needs no cast — a cast in a test makes it agree with
 *  itself. */
function localeTables(): { code: string; table: Record<string, string[]> }[] {
    const tables: { code: string; table: Record<string, string[]> }[] = [];
    for (const entry of readdirSync(LocalesDirectory, {
        withFileTypes: true,
    })) {
        if (!entry.isDirectory()) continue;
        const code = entry.name;
        let parsed: unknown;
        try {
            parsed = JSON.parse(
                readFileSync(
                    join(LocalesDirectory, code, `${code}.json`),
                    'utf8',
                ),
            );
        } catch {
            continue;
        }
        if (!isRecord(parsed)) continue;
        const input = parsed['input'];
        if (!isRecord(input)) continue;
        const key = input['Key'];
        if (!isRecord(key)) continue;
        const keys = key['keys'];
        if (!isRecord(keys)) continue;
        const table: Record<string, string[]> = {};
        for (const [name, value] of Object.entries(keys))
            if (isStringArray(value)) table[name] = value;
        tables.push({ code, table });
    }
    return tables;
}

test('every locale names the function keys as they are printed', () => {
    const wrong: string[] = [];
    for (const { code, table } of localeTables())
        for (const [name, aliases] of Object.entries(table)) {
            if (!/^F\d+$/.test(name)) continue;
            const named = aliases.map((alias) => withoutAnnotations(alias));
            // Exactly the printed label: an extra alias would become the
            // shortcut list's label, since that takes the last one.
            if (named.length !== 1 || named[0] !== name)
                wrong.push(`${code} ${name} = ${JSON.stringify(named)}`);
        }
    expect(
        wrong,
        'a function key is printed the same on every keyboard, so translating or transliterating it names a key nobody can find',
    ).toEqual([]);
});

/**
 * Collisions that already shipped, kept so this test catches *new* ones.
 *
 * All three are the same mistake in three scripts: the model rendered both Enter
 * and Insert as the verb "to enter/insert", so one of the two keys is unreachable
 * from `Key('…')`. German had it too (`Eingeben`/`Einfügen`) and was repaired by
 * giving Insert the abbreviation its keycap actually prints, `Einfg` — which is
 * the shape of the fix here, but it takes someone who reads the language to say
 * what that abbreviation is. Listed rather than guessed at, and listed rather
 * than ignored, so the backlog is visible. (he-IL's also carries niqqud, which
 * `checkPointedNames` strips from names elsewhere.)
 */
const KnownCollisions = [
    'el-GR "Εισάγω" is both Enter and Insert',
    'gu-IN "દાખલ કરો" is both Enter and Insert',
    'he-IL "לְהַכנִיס" is both Enter and Insert',
];

test('no two keys in a locale answer to the same name', () => {
    // `canonicalizeKeyName` walks the table and takes the first match, so a name
    // claimed twice makes one of the two keys unreachable from `Key('…')`. The
    // German repair had to route around exactly this: Insert and Paste both
    // wanted "Einfügen".
    const collisions: string[] = [];
    for (const { code, table } of localeTables()) {
        const claimed = new Map<string, string>();
        for (const [name, aliases] of Object.entries(table))
            for (const alias of aliases) {
                const word = withoutAnnotations(alias).trim();
                if (word.length === 0) continue;
                const already = claimed.get(word);
                if (already !== undefined && already !== name)
                    collisions.push(
                        `${code} "${word}" is both ${already} and ${name}`,
                    );
                else claimed.set(word, name);
            }
    }
    expect(
        collisions.filter((c) => !KnownCollisions.includes(c)),
        'a name claimed by two keys makes one of them unreachable from Key()',
    ).toEqual([]);
    // And the backlog must shrink rather than rot: a fixed one has to leave the
    // list, or the list stops describing what is actually wrong.
    expect(
        KnownCollisions.filter((c) => !collisions.includes(c)),
        'these are fixed now; remove them from KnownCollisions',
    ).toEqual([]);
});

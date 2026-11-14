import { get } from 'svelte/store';
import { expect, test } from 'vitest';
import { commitLocaleEdit, durably, localeEdits } from './LocalizationDexie';

test('an unchanged edit confirms nothing', async () => {
    expect(
        await commitLocaleEdit('es-MX', 'a.b', 'hola', 'hola', undefined),
    ).toBeUndefined();
    expect(
        await commitLocaleEdit('es-MX', 'a.b', 'adiós', 'hola', 'adiós'),
    ).toBeUndefined();
});

test('a changed edit is saved, and the official text again is a revert', async () => {
    expect(
        (await commitLocaleEdit('es-MX', 'a.b', 'adiós', 'hola', undefined))
            ?.kind,
    ).toBe('saved');
    expect(
        (await commitLocaleEdit('es-MX', 'a.b', 'hola', 'hola', 'adiós'))?.kind,
    ).toBe('reverted');
});

/** The store updates before the write, so a write that fails must put it back, or the page
 *  shows an edit a reload would lose. */
test('a failed write restores the edits it had optimistically shown', async () => {
    const before = new Map([['es-MX', new Map([['a.b', 'hola']])]]);
    localeEdits.set(new Map([['es-MX', new Map([['a.b', 'adiós']])]]));
    await expect(
        durably(() => Promise.reject(new Error('quota')), before),
    ).rejects.toThrow('quota');
    expect(get(localeEdits)).toBe(before);
    // The suite runs unisolated, so leave the shared store as it was found.
    localeEdits.set(new Map());
});

/**
 * A character name no earlier test or run has already taken.
 *
 * A creator's character names must be unique, and a colliding one is
 * deliberately not saved (#822) — so a fixed name in a test works exactly once
 * and then silently stops saving on any emulator that keeps its data between
 * runs, leaving the tile unnamed and the assertion hunting for a name that was
 * never stored. Letters only, since a character's name must be a valid
 * Wordplay name.
 */
export function uniqueCharacterName(prefix: string): string {
    const suffix = Array.from({ length: 6 }, () =>
        String.fromCharCode(97 + Math.floor(Math.random() * 26)),
    ).join('');
    return `${prefix}${suffix}`;
}

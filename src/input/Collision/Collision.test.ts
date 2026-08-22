import { expect, test } from 'vitest';
import { getWatchedNames } from './Collision';

/**
 * A Collision stream is what puts an output in the physical world: naming two
 * things is all it takes to make them notice each other, without either one
 * declaring Matter (#548). The names are runtime values rather than source
 * text, so this works over whatever the stream was last handed.
 */

/** A stand-in carrying only the two fields getWatchedNames reads, so the
 *  policy can be tested without evaluating a program. */
function watching(subject?: string, object?: string) {
    return { subject, object } as unknown as Parameters<
        typeof getWatchedNames
    >[0][number];
}

test('a Collision naming two outputs watches both', () => {
    expect(getWatchedNames([watching('ball', 'keeper')])).toEqual(
        new Set(['ball', 'keeper']),
    );
});

test('a Collision naming one output watches only it', () => {
    // The other side of the bump is whatever is already in the physical
    // world; a one-name stream pulls nothing else in.
    expect(getWatchedNames([watching('bird')])).toEqual(new Set(['bird']));
});

test('a Collision naming an object but no subject watches the object', () => {
    expect(getWatchedNames([watching(undefined, 'net')])).toEqual(
        new Set(['net']),
    );
});

test('a Collision naming nothing watches nothing', () => {
    // A catch-all reports bumps among output already simulated rather than
    // pulling every phrase on stage into the world, which is what keeps it free.
    expect(getWatchedNames([watching()])).toEqual(new Set());
});

test('several Collisions are watched together, without duplicates', () => {
    expect(
        getWatchedNames([
            watching('ball', 'keeper'),
            watching('ball', 'net'),
            watching('kitty'),
            watching(),
        ]),
    ).toEqual(new Set(['ball', 'keeper', 'net', 'kitty']));
});

test('no Collisions at all watch nothing', () => {
    // The case every project without collisions takes: no names, so no body is
    // ever created for one, so Rapier never loads.
    expect(getWatchedNames([])).toEqual(new Set());
});

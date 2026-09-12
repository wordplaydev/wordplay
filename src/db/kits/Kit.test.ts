import { expect, test } from 'vitest';
import {
    findPublishTarget,
    isWithdrawable,
    KitSchema,
    makeKit,
    nextVersion,
    type SerializedKit,
} from './Kit';

function kit(over: Partial<SerializedKit> = {}): SerializedKit {
    return { ...makeKit('k1', 'amy', 'amy/colors', '', 'p1'), ...over };
}

test('a kit that has published nothing starts at version 1', () => {
    expect(nextVersion(undefined)).toBe(1);
    expect(nextVersion(kit())).toBe(1);
});

test('a withdrawn version number is never reissued', () => {
    // The hazard this rule exists for: a version document is cached in IndexedDB
    // permanently and never invalidated, so a reissued number would resolve to the
    // withdrawn code for anyone who had already fetched it, and to the new code for
    // everyone else — one id, two programs.
    const published = kit({ latest: 2, versionCount: 2 });
    const withdrawn = { ...published, latest: 1 };
    expect(nextVersion(withdrawn)).toBe(3);
    // Numbering from `latest`, which is what this replaced, would have reissued 2.
    expect(nextVersion(withdrawn)).not.toBe(withdrawn.latest + 1);
});

test('numbering is unchanged for a kit nothing has been withdrawn from', () => {
    // The whole change has to be a no-op for every kit that exists today.
    for (let n = 0; n < 5; n++)
        expect(nextVersion(kit({ latest: n, versionCount: n }))).toBe(n + 1);
});

test('the newest version is withdrawable while the kit has never been listed', () => {
    expect(isWithdrawable(kit({ latest: 1, versionCount: 1 }))).toBe(true);
});

test('nothing is withdrawable once a moderator has seen the kit', () => {
    // Unlisting again does not make a borrow someone already holds go away, so
    // `moderation` and not `public` is what decides.
    for (const moderation of ['pending', 'approved', 'denied'] as const)
        expect(
            isWithdrawable(
                kit({ latest: 1, versionCount: 1, moderation, public: false }),
            ),
        ).toBe(false);
});

test('a kit with no versions has nothing to withdraw', () => {
    expect(isWithdrawable(kit({ latest: 0, versionCount: 0 }))).toBe(false);
});

function registry(...kits: SerializedKit[]) {
    return new Map(kits.map((kit) => [kit.id, kit]));
}

const colors = { ...makeKit('k1', 'amy', 'amy/colors', '', 'p1'), latest: 1 };

test('a project publishes a new version of the kit it recorded', () => {
    expect(findPublishTarget(registry(colors), 'k1', 'amy')?.id).toBe('k1');
});

test('a rename does not make publishing create a second kit', () => {
    // The regression the id exists to prevent: after `changeUsername`, the kit is called
    // `bo/colors` while the project's dialog would compute `amy/colors` from the name it
    // was published under. A name lookup finds nothing and publishes a *second* kit;
    // the id finds the same one, and the publish is version 2.
    const renamed: SerializedKit = {
        ...colors,
        name: 'bo/colors',
        aliases: ['amy/colors'],
    };
    const found = findPublishTarget(registry(renamed), 'k1', 'amy');
    expect(found?.id).toBe('k1');
    expect(found?.latest).toBe(1);
    // A name lookup over the same registry is what used to happen, and finds nothing.
    expect(
        [...registry(renamed).values()].find((k) => k.name === 'amy/colors'),
    ).toBeUndefined();
});

test('a project that has never published has no target', () => {
    expect(findPublishTarget(registry(colors), null, 'amy')).toBeUndefined();
});

test('a remix cannot publish over its origin', () => {
    // A copy carries its origin's code but is not its origin's kit to republish.
    expect(findPublishTarget(registry(colors), 'k1', 'bo')).toBeUndefined();
});

test('a kit that is known absent is not a target', () => {
    expect(
        findPublishTarget(new Map([['k1', null]]), 'k1', 'amy'),
    ).toBeUndefined();
});

/**
 * A stored kit written before a field existed must still read.
 *
 * `upgradeKit` switches on `v`, so it only repairs a document *below* the latest version —
 * a v1 kit missing a v1 field is never touched, and `safeParse` fails on it forever. Every
 * caller drops what it cannot parse, so the symptom is not an error but an absence: this
 * is exactly how a pending kit went missing from the moderator queue, while the publish
 * panel kept showing it from the unparsed Dexie mirror.
 */
// A real one, because `id` is `z.string().uuid()` and these two actually parse.
const UUID = '2d00ebaa-018f-4ac4-86b4-d9f8013fe1df';

test('a kit stored before `listed` existed still parses', () => {
    const stored: Record<string, unknown> = { ...kit({ id: UUID }) };
    delete stored.listed;
    delete stored.listedVersion;

    const parsed = KitSchema.safeParse(stored);
    expect(parsed.success).toBe(true);
    // Defaulted to "not listed", which is the safe answer: a kit nobody approved must not
    // arrive in the registry by omission.
    expect(parsed.data?.listed).toBe(false);
    expect(parsed.data?.listedVersion).toBeNull();
});

test('a kit that carries them keeps what it says', () => {
    const parsed = KitSchema.safeParse({
        ...kit({ id: UUID, listed: true, listedVersion: 2 }),
    });
    expect(parsed.data?.listed).toBe(true);
    expect(parsed.data?.listedVersion).toBe(2);
});

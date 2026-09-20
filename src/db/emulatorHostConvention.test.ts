import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

/**
 * Nothing dials a Firebase emulator by the name `localhost`.
 *
 * firebase-tools binds every emulator to 127.0.0.1 and nothing else —
 * firebase.json declares ports only — and macOS resolves `localhost` to ::1
 * first, where nothing is listening. The app reached all three emulators that
 * way, which on the WebKit nightly read as Listen and Write channels finishing
 * with status -1 and a Firestore that "didn't respond within 10 seconds".
 * `firebase.ts` now derives the host from the page's own origin; the Node-side
 * helpers name the address outright.
 *
 * The other half of the rule is *agreement*, and it is the half that will rot.
 * `tests/helpers/firestoreOffline.ts` cuts the page off from the cloud by
 * matching its Firestore requests against a pattern — so a host the app dials
 * that the pattern does not know turns the whole offline-replay suite into a
 * test of nothing, without ever failing.
 */

/** The emulator ports firebase.json declares, plus the Emulator UI's. */
const Ports = ['9099', '8080', '5001', '5002', '4000'];

/**
 * Scoped to the directories that actually talk to an emulator. That is what
 * lets this run without an exemption list: `src/parser` has three legitimate
 * `http://localhost:8080` literals (a URL is exactly what its tokenizer is
 * for) and `src/locale/getLocale.ts` names the dev server's 5173, none of
 * which are emulator hosts.
 */
const Directories = ['src/db', 'tests', 'scripts', 'playwright'];

/** `localhost` used as the host of an emulator port, however it is spelled:
 *  `http://localhost:8080`, `'localhost', 8080`, `host: 'localhost:8080'`. */
const Offender = new RegExp(
    `localhost['"]?\\s*[:,]\\s*['"]?(?:${Ports.join('|')})\\b`,
);

function sources(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) sources(full, found);
        else if (/\.(ts|js|svelte)$/.test(entry)) found.push(full);
    }
    return found;
}

/** Comments stripped first, the way localeFetchConvention does: several of
 *  these files explain the rule, and flagging the explanation would teach
 *  people to stop writing it down. */
function withoutComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

test('no emulator is dialed by the name localhost', () => {
    const offenders: string[] = [];
    for (const directory of Directories) {
        const root = path.join(process.cwd(), directory);
        for (const file of sources(root)) {
            const code = withoutComments(readFileSync(file, 'utf8'));
            if (Offender.test(code))
                offenders.push(path.relative(process.cwd(), file));
        }
    }
    expect(
        offenders,
        `These dial a Firebase emulator by name. The emulators bind 127.0.0.1, and the name resolves to ::1 first on macOS — a refused connection before every call. Use the address, or derive the host from the page's origin as src/db/firebase.ts does:\n${offenders.join('\n')}`,
    ).toEqual([]);
});

/**
 * The app's host and the offline helper's pattern have to agree.
 *
 * Asserted as "the pattern admits both spellings" rather than by parsing
 * `firebase.ts`: the app follows whatever origin served it, so the set of
 * hosts it can dial is exactly the set a contributor can serve the build from,
 * and the two that matter are the two loopback spellings.
 */
test('the offline helper cuts Firestore at either spelling of loopback', () => {
    const helper = readFileSync(
        path.join(process.cwd(), 'tests/helpers/firestoreOffline.ts'),
        'utf8',
    );
    const match = /const FIRESTORE = \/(.+?)\/;/.exec(helper);
    expect(
        match,
        'firestoreOffline.ts no longer declares a FIRESTORE pattern',
    ).not.toBe(null);
    const pattern = new RegExp(match?.[1] ?? '$^');
    for (const host of ['localhost', '127.0.0.1'])
        expect(
            pattern.test(
                `http://${host}:8080/google.firestore.v1.Firestore/Write/channel`,
            ),
            `cutFirestore would not abort a request to ${host}:8080, so offline-replay would test nothing`,
        ).toBe(true);
});

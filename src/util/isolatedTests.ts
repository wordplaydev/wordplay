/**
 * The test files that run isolated, and the only ones that do. Everything else shares a module
 * graph per worker, which is where the suite's speed comes from — about half its CPU used to go on
 * re-importing the same 350-module graph, and rebuilding a Basis, once per test file.
 *
 * Paths are repo-relative with forward slashes.
 */

/**
 * Files that call `vi.mock`: a mocked module stays mocked for every later file sharing the worker,
 * so these must not share one. `testIsolationConvention.test.ts` fails if this list and the files
 * that actually mock ever disagree, in either direction.
 */
export const MockingTests = [
    'src/db/characters/CharacterDatabase.test.ts',
    'src/db/chats/ChatDatabase.test.ts',
    'src/db/feedback/FeedbackDatabase.test.ts',
    'src/db/galleries/GalleryDatabase.test.ts',
    'src/db/getFirebaseTranslator.test.ts',
    'src/db/howtos/HowToDatabase.test.ts',
    'src/db/projects/PresenceTracker.test.ts',
    'src/db/projects/YjsFirestoreProvider.test.ts',
    'src/db/teachers/TeacherDatabase.test.ts',
    'src/output/Arrangement/rowBaseline.test.ts',
    'src/output/Bubble/bubbleLayout.test.ts',
    'src/output/Output/measureFormats.test.ts',
    'src/output/Output/stageBubbleBounds.test.ts',
    'src/output/physics/contacts.test.ts',
    'src/output/physics/worldLifetime.test.ts',
    'src/util/localeGoto.test.ts',
];

/**
 * Files that don't mock but still need their own graph. Showcase compiles every tour example in
 * every locale, and unisolated it fails intermittently — a different locale each time — so some
 * other file leaves behind state it reads. `Basis.localeKey` caching one basis per locale *name*
 * rather than per locale content is the likeliest source; which file poisons it is not yet pinned
 * down, so this keeps its own graph rather than the suite keeping a flaky test.
 */
export const OrderSensitiveTests = ['src/components/app/Showcase.test.ts'];

const IsolatedTests = [...MockingTests, ...OrderSensitiveTests];

export default IsolatedTests;

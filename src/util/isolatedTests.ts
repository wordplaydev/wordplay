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
 * Files that don't mock but still need their own graph. Empty: the one thing that needed it was a
 * synthetic locale in Basis.test.ts publishing en-US content under zh-CN's key in the global basis
 * cache, which is fixed at the source rather than hidden behind isolation.
 */
export const OrderSensitiveTests: string[] = [];

const IsolatedTests = [...MockingTests, ...OrderSensitiveTests];

export default IsolatedTests;

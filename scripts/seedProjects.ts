/**
 * The programs seeded into the Firebase emulator as `creator`'s public
 * projects.
 *
 * These are deliberately small but *different from each other*: each one
 * exercises a distinct evaluation path (no streams, a temporal stream, a
 * reactive rebinding, an animated pose, a place-valued stream), and each has a
 * distinct name so project lists, search, and previews have something realistic
 * to chew on. The seed used to write ten copies of `Phrase("<name>")`, which
 * looked like data but tested nothing.
 *
 * Kept free of Firebase imports so `seedProjects.test.ts` can validate every
 * program without standing up a project. That test is the only thing standing
 * between a typo here and a broken emulator, so keep them in sync.
 */
export type SeedProject = {
    /** Stable Firestore document ID — reruns overwrite in place. */
    id: string;
    name: string;
    /** Wordplay source for the project's single `start` source file. */
    code: string;
};

export const SEED_PROJECTS: SeedProject[] = [
    {
        // seed-project-00 is referenced by seedChats() for the moderation
        // queue, so this entry has to keep that exact ID.
        id: 'seed-project-00',
        name: 'Bread Recipe',
        code: `¶A still list of steps. No streams, so it evaluates once and never changes.¶
ƒ step(number•# instruction•'') Phrase("\\number\\. \\instruction\\" size: 0.4m)

Stage([Group(Stack() [
	Phrase("🍞 Bread" size: 0.8m)
	step(1 "Mix flour, water, salt, and yeast")
	step(2 "Rest the dough for an hour")
	step(3 "Fold it over four times")
	step(4 "Bake until the crust is dark")])])`,
    },
    {
        id: 'seed-project-01',
        name: 'Stopwatch',
        code: `¶@Time gives a new value every second, so this counts up on its own.¶
seconds: ((Time(1000ms) → #s) ÷ 1s).roundDown()

Stage([Phrase("⏱️ \\seconds\\" size: 2m)])`,
    },
    {
        id: 'seed-project-02',
        name: 'Key Echo',
        code: `¶Every key press adds to the text, by rebinding whenever @Key changes.¶
key: Key()
typed: "Type! " … ∆ key … typed + key

Stage([Phrase(typed size: 0.6m)])`,
    },
    {
        id: 'seed-project-03',
        name: 'Bouncing Ball',
        code: `¶A resting @Sequence animates forever without any input.¶
Stage([Phrase("⚽" size: 3m resting: Sequence.bounce(duration: 2s))])`,
    },
    {
        id: 'seed-project-04',
        name: 'Follow Me',
        code: `¶@Pointer is a stream of places, so the eyes track wherever you point.¶
spot: Pointer()

Stage([Phrase("👀" size: 2m place: Place(spot.x spot.y))])`,
    },
];

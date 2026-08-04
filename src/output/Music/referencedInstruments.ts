import type Project from '@db/projects/Project';
import type Bind from '@nodes/Bind';
import { InstrumentKeys, type InstrumentKey } from '@output/Music/instruments';

/**
 * Every instrument a project might play, read from its source rather than from
 * a running evaluation — so the recordings can start loading when a project
 * opens instead of when a note asks for them.
 *
 * Reading references catches more than it looks like it would: a function that
 * chooses an instrument (Conductor's `ƒ voice(count•#)•🔈`) still names each
 * one literally, so every branch is found whether or not it's ever taken.
 *
 * Two things it can't see, both handled:
 *
 *  - **The implicit piano.** `Track`'s instrument input defaults to
 *    `🔈.piano`, so a project can play piano with no reference to it at all.
 *    Any project with a `Track` gets piano.
 *  - **A computed id.** `🔈(someText)` is legal and names nothing. The player
 *    tops this up at runtime from the evaluated tracks; requesting is
 *    idempotent, so the two sources compose.
 */
export default function referencedInstruments(
    project: Project,
): InstrumentKey[] {
    const found = new Set<InstrumentKey>();
    for (const [key, bind] of instrumentBinds(project))
        if (project.getReferences(bind).length > 0) found.add(key);

    if (project.getReferences(project.shares.output.Track).length > 0)
        found.add('piano');

    return [...found];
}

/**
 * Each palette key paired with the static `Bind` that names it.
 *
 * Recovering the key follows `Instrument`'s own staticBuilder: the en-US key is
 * always among a bind's names, since `getBind` includes the English name in
 * every locale's name list. Callers get the bind rather than a string so a
 * localized name comes from the definition — `locales.getName(bind.names)` —
 * rather than from locale text, per the naming convention.
 */
export function instrumentBinds(project: Project): Map<InstrumentKey, Bind> {
    const context = project.getContext(project.getMain());
    const binds = new Map<InstrumentKey, Bind>();
    for (const bind of project.shares.output.Instrument.getStaticBindsWithValues(
        context,
    )) {
        const names = bind.names.getNames();
        const key = InstrumentKeys.find((candidate) =>
            names.includes(candidate),
        );
        if (key !== undefined) binds.set(key, bind);
    }
    return binds;
}

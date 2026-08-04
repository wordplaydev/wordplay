import concretize from '@locale/concretize';
import type LocaleText from '@locale/LocaleText';
import Locales from '@locale/Locales';
import type Definition from '@nodes/Definition';
import createDefaultShares from '@runtime/createDefaultShares';
import type Log from '@util/verify-locales/Log';
import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';

/**
 * Verify that no two *different* global default-share definitions — output types and input streams
 * ({@link createDefaultShares}) — share a name in this locale, and likewise that no two `↑` static
 * members of the same structure do. Duplicate names are permitted only when the definitions are the
 * **same concept** (the identical definition, or one that `isEqualTo` another); two **different**
 * concepts sharing a name is a hard error.
 *
 * This catches the class of bug where a translation collapses distinct shares into one word (e.g.
 * `rotatein` and `rotateout` both becoming `rotation`): any program that then uses that name resolves
 * ambiguously and gets a `DuplicateName` conflict. Catching it here surfaces it up front rather than
 * only when a tutorial or doc example happens to trip it.
 */
export default function checkGlobalNames(log: Log, locale: LocaleText): void {
    // Build the shares with only this locale's names (its own fallback, not en-US), so we test the
    // names the locale actually declares rather than en-US fill-ins. A machine translation can
    // produce a name that isn't a valid identifier (e.g. a multi-word phrase), which makes building
    // the share definitions throw; report it as a repairable problem (npm run locales-fix folds such
    // names via toValidName) rather than crashing the whole verify/translate run.
    let shares;
    try {
        shares = createDefaultShares(
            new Locales(concretize, [locale], locale),
        ).all;
    } catch (error) {
        log.bad(
            `Could not build this locale's global definitions — a name likely translated to an invalid identifier. Run "npm run locales-fix" to repair. (${error instanceof Error ? error.message : String(error)})`,
        );
        return;
    }

    reportCollisions(log, 'Global name', shares);

    // The same check within each structure's `↑` static members (e.g. `Sequence`'s
    // animations, `Color`'s colors, `Instrument`'s instruments). They left the global
    // namespace but not the collision risk: a translation that collapses two of them makes
    // `Sequence.rotatein` and `Sequence.rotateout` the same name.
    for (const def of shares) {
        if (!(def instanceof StructureDefinition)) continue;
        const block = def.expression;
        if (!(block instanceof Block)) continue;
        // Recognize statics by their `↑` token rather than `isStatic`, which needs a
        // Context; every statement here is a direct child of the structure's block anyway.
        const statics = block.statements.filter(
            (s): s is Bind | FunctionDefinition =>
                (s instanceof Bind || s instanceof FunctionDefinition) &&
                s.share !== undefined,
        );
        reportCollisions(
            log,
            `Static name on ${def.names.getNames()[0]}`,
            statics,
        );
    }
}

/** Report any name shared by two definitions that aren't the same concept. */
function reportCollisions(log: Log, label: string, defs: Definition[]): void {
    const byName = new Map<string, Definition[]>();
    for (const def of defs)
        for (const name of def.names.getNames()) {
            const existing = byName.get(name) ?? [];
            existing.push(def);
            byName.set(name, existing);
        }

    for (const [name, sharing] of byName) {
        if (sharing.length < 2) continue;
        // Collapse definitions that are the same concept; >1 distinct concept means a real collision.
        const distinct = sharing.filter(
            (def, index) =>
                sharing.findIndex((o) => o === def || o.isEqualTo(def)) ===
                index,
        );
        if (distinct.length > 1)
            log.bad(
                `${label} "${name}" is used by ${distinct.length} different concepts (${distinct
                    .map((d) => d.names.getNames().join('/'))
                    .join('; ')}). Give each concept a distinct name.`,
            );
    }
}

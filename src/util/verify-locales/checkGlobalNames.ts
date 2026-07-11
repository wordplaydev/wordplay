import concretize from '@locale/concretize';
import type LocaleText from '@locale/LocaleText';
import Locales from '@locale/Locales';
import type Definition from '@nodes/Definition';
import createDefaultShares from '@runtime/createDefaultShares';
import type Log from '@util/verify-locales/Log';

/**
 * Verify that no two *different* global default-share definitions — output types, input streams, and
 * sequence functions ({@link createDefaultShares}) — share a name in this locale. Duplicate global
 * names are permitted only when the definitions are the **same concept** (the identical definition,
 * or one that `isEqualTo` another); two **different** concepts sharing a name is a hard error.
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
            2,
            `Could not build this locale's global definitions — a name likely translated to an invalid identifier. Run "npm run locales-fix" to repair. (${error instanceof Error ? error.message : String(error)})`,
        );
        return;
    }

    const byName = new Map<string, Definition[]>();
    for (const def of shares)
        for (const name of def.names.getNames()) {
            const defs = byName.get(name) ?? [];
            defs.push(def);
            byName.set(name, defs);
        }

    for (const [name, defs] of byName) {
        if (defs.length < 2) continue;
        // Collapse definitions that are the same concept; >1 distinct concept means a real collision.
        const distinct = defs.filter(
            (def, index) =>
                defs.findIndex((o) => o === def || o.isEqualTo(def)) === index,
        );
        if (distinct.length > 1)
            log.bad(
                2,
                `Global name "${name}" is used by ${distinct.length} different concepts (${distinct
                    .map((d) => d.names.getNames().join('/'))
                    .join('; ')}). Give each concept a distinct name.`,
            );
    }
}

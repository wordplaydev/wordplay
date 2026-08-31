/**
 * `npm run locales-drift` — report, and optionally queue, translations that have
 * gone stale relative to en-US (#1144). The detection itself lives in `drift.ts`;
 * this is the command around it.
 *
 * Flags:
 *   --mark           stamp `$!` on the stale translations so `npm run
 *                    locales-translate` (or `translate.yml`) re-translates them
 *   --only-machine   with --mark, leave hand-written translations alone
 *   --details        print every stale path, not just the per-locale counts
 *   --staged         cheap pre-commit mode: report en-US strings whose meaning
 *                    changed in the staged diff, without walking history
 *   --json <file>    write the full census as JSON
 *   --links          report (with --mark, queue) translations whose @Concept
 *                    links no longer match their en-US source
 *   --since <ref>    gate mode: report only drift this change introduces since
 *                    <ref> (needs just that one commit, not the full history)
 *   --fail-on-drift  exit non-zero when anything is markable
 *   <locale>…        limit the run to these locales
 */

import fs from 'node:fs';
import Log from '@util/verify-locales/Log';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import type LocaleText from '@locale/LocaleText';
import writeFormatted from '@util/verify-locales/writeFormatted';
import {
    censusLocale,
    changedBetween,
    driftSince,
    findLostConceptLinks,
    describe,
    getCheckablePathKinds,
    getTranslatedLocales,
    getTutorialSources,
    isMarkable,
    markStale,
    readJSON,
    summarize,
    type Stale,
} from '@util/verify-locales/drift';
import { getTutorialPath } from '@util/verify-locales/TutorialSchema';

async function run(): Promise<void> {
    // Annotated because TS only narrows past a `never`-returning call when the
    // receiver has a declared type.
    const log: Log = new Log();
    const args = process.argv.slice(2);
    const mark = args.includes('--mark');
    const onlyMachine = args.includes('--only-machine');
    const details = args.includes('--details');
    const jsonIndex = args.indexOf('--json');
    const jsonPath = jsonIndex >= 0 ? args[jsonIndex + 1] : undefined;
    const requested = args.filter(
        (arg, index) =>
            arg !== '' &&
            !arg.startsWith('--') &&
            // Skip a flag's value, but only when the flag was actually given;
            // otherwise index + 1 is 0 and eats the first locale.
            !(jsonIndex >= 0 && index === jsonIndex + 1) &&
            !(
                args.indexOf('--since') >= 0 &&
                index === args.indexOf('--since') + 1
            ),
    );

    const available = getTranslatedLocales();
    const locales =
        requested.length > 0
            ? requested.filter((locale) => available.includes(locale))
            : available;
    if (locales.length === 0) log.exit('No locales to check.');

    const sourceLocale = readJSON<LocaleText>(getLocalePath('en-US'));
    // One entry per tutorial mode: the two tutorials are different documents
    // whose path ids collide, so their kinds maps must never be merged.
    const tutorials = getTutorialSources();
    if (sourceLocale === undefined || tutorials.length === 0)
        log.exit('Could not read the en-US locale or tutorial.');

    const localeKinds = getCheckablePathKinds(sourceLocale);

    /** The en-US source, the locale's file, and the matching kinds map, for the
     *  locale file and for every tutorial mode. */
    function filesFor(locale: string) {
        return [
            [
                getLocalePath('en-US'),
                getLocalePath(locale),
                localeKinds,
                sourceLocale as unknown as Record<string, unknown>,
            ] as const,
            ...tutorials.map(
                ({ mode, source, kinds }) =>
                    [
                        getTutorialPath('en-US', mode),
                        getTutorialPath(locale, mode),
                        kinds,
                        source,
                    ] as const,
            ),
        ];
    }

    // Lost `@Concept` links: a different failure from drift, sharing all the
    // same machinery (path kinds, marking, writing), so it rides along here
    // rather than as a second command.
    if (args.includes('--links')) {
        const lost: Stale[] = [];
        for (const locale of locales)
            for (const [, file, kinds, source] of filesFor(locale)) {
                const text = readJSON(file);
                if (text === undefined) continue;
                lost.push(
                    ...findLostConceptLinks(locale, file, kinds, source, text),
                );
            }
        if (lost.length === 0) {
            log.good('Every translation carries the links its source does.');
            return;
        }
        const scope = log.say(
            `${lost.length} translation(s) lost a @Concept link their en-US source has.`,
        );
        for (const locale of locales) {
            const count = lost.filter((e) => e.locale === locale).length;
            if (count > 0) scope.say(`${locale}: ${count}`);
        }
        if (!mark) {
            log.say('Run with --mark to queue them for re-translation.');
            return;
        }
        let marked = 0;
        for (const locale of locales)
            for (const [, file, kinds] of filesFor(locale)) {
                const entries = lost.filter(
                    (e) => e.locale === locale && e.file === file,
                );
                if (entries.length === 0) continue;
                const text = readJSON(file);
                if (text === undefined) continue;
                const count = markStale(entries, kinds, text);
                if (count === 0) continue;
                await writeFormatted(
                    file,
                    JSON.stringify(text, null, 4),
                    true,
                    log,
                );
                marked += count;
            }
        log.good(
            `Marked ${marked} translation(s) "$!"; "npm run locales-translate" will restore their links.`,
        );
        return;
    }

    // Gate mode: only the drift this change introduces. The absolute census
    // can't be a gate — a reworded en-US string whose translation was already
    // correct re-translates to the same bytes, leaving no trace for value
    // history, so a slice of it never clears. This asks the answerable question
    // instead, and reads one commit rather than the whole history.
    const sinceIndex = args.indexOf('--since');
    if (sinceIndex >= 0) {
        const base = args[sinceIndex + 1];
        if (base === undefined) log.exit('--since needs a base ref.');
        const introduced = locales.flatMap((locale) =>
            filesFor(locale).flatMap(([source, target, kinds]) =>
                driftSince(base, source, target, locale, kinds),
            ),
        );
        const queueable = introduced.filter((entry) => entry.kind !== 'name');
        if (queueable.length === 0) {
            log.good(
                `No translations were left behind by changes since ${base}.`,
            );
            return;
        }
        const scope = log.bad(
            `${queueable.length} translation(s) fell behind an en-US string this change reworded. Run "npm run locales-drift -- --mark" and commit the result.`,
        );
        for (const entry of queueable.slice(0, 20))
            scope.say(`${entry.locale} ${entry.id}`);
        if (queueable.length > 20)
            scope.say(`…and ${queueable.length - 20} more.`);
        process.exitCode = 1;
        return;
    }

    // The staged check answers a different, cheaper question — "did this commit
    // change any English meanings?" — so it exits before the history walk.
    if (args.includes('--staged')) {
        const changes = [
            ...changedBetween(
                'HEAD',
                '',
                getLocalePath('en-US'),
                localeKinds,
            ).map((change) => ({ ...change, file: 'en-US.json' })),
            // Every mode, each labelled by its own file rather than a
            // hardcoded name, so a staged quick tutorial says which it was.
            ...tutorials.flatMap(({ mode, kinds }) => {
                const file = getTutorialPath('en-US', mode);
                return changedBetween('HEAD', '', file, kinds).map(
                    (change) => ({
                        ...change,
                        file: file.slice(file.lastIndexOf('/') + 1),
                    }),
                );
            }),
        ];
        if (changes.length === 0) return;
        const scope = log.warning(
            `${changes.length} en-US string(s) changed meaning in this commit; their translations are now behind.`,
        );
        for (const change of changes.slice(0, 20))
            scope.say(
                `${change.file} ${change.id}: ${change.previous} → ${change.current}`,
            );
        if (changes.length > 20) scope.say(`…and ${changes.length - 20} more.`);
        scope.say(
            'Run "npm run locales-fix" to queue the translations they left behind.',
        );
        return;
    }

    log.say(
        `Checking ${locales.length} locale(s) for translations whose en-US source changed after they did.`,
    );

    const all: Stale[] = [];
    for (const locale of locales) {
        const stale = censusLocale(
            locale,
            localeKinds,
            tutorials,
            sourceLocale as unknown as Record<string, unknown>,
        );
        all.push(...stale);
        const counts = summarize(stale);
        const line = `${locale}: ${counts.total} stale — ${counts.markable} markable (${counts.machine} machine, ${counts.human} human), ${counts.names} name path(s) to review by hand`;
        const scope =
            counts.total === 0
                ? log.good(`${locale}: no drift`)
                : log.say(line);
        if (details) for (const entry of stale) describe(entry, scope);
    }

    if (jsonPath !== undefined) {
        fs.writeFileSync(jsonPath, JSON.stringify(all, null, 2));
        log.good(`Wrote ${all.length} entries to ${jsonPath}.`);
    }

    const markable = all.filter((entry) => isMarkable(entry, onlyMachine));
    const names = all.filter((entry) => entry.kind === 'name');

    if (all.length === 0) {
        log.good(
            'No drift: every translation is at least as new as its source.',
        );
        return;
    }

    const summary = `${all.length} stale translation(s) across ${locales.length} locale(s); ${markable.length} can be queued for re-translation.`;
    // The gate fails only on drift that `--mark` can actually queue. Name paths
    // have no mechanical remedy, so failing on them would be a gate nobody can
    // satisfy; they are reported as a warning and reviewed by hand.
    if (args.includes('--fail-on-drift') && markable.length > 0) {
        log.bad(
            `${summary} Run "npm run locales-drift -- --mark" and commit the result, then re-translate.`,
        );
        // Set the code rather than exiting, so piped output isn't truncated
        // mid-write — the same reason start.ts does it this way.
        process.exitCode = 1;
    } else log.say(summary);
    if (names.length > 0)
        log.warning(
            `${names.length} of them are name paths, which are never auto-marked — machine re-translating names is how cross-locale name collisions happen. Review them by hand.`,
        );

    if (!mark) {
        if (markable.length > 0)
            log.say(
                'Run with --mark to stamp "$!" on them, then run "npm run locales-translate" (or dispatch the Translate locales workflow).',
            );
        return;
    }

    // Group by file so each locale's JSON is read, marked, and written once.
    let marked = 0;
    for (const locale of locales) {
        for (const [, file, kinds] of filesFor(locale)) {
            const entries = markable.filter(
                (entry) => entry.locale === locale && entry.file === file,
            );
            if (entries.length === 0) continue;
            const text = readJSON(file);
            if (text === undefined) continue;
            const count = markStale(entries, kinds, text);
            if (count === 0) continue;
            await writeFormatted(
                file,
                JSON.stringify(text, null, 4),
                true,
                log,
            );
            marked += count;
        }
    }
    log.good(
        `Marked ${marked} translation(s) with "$!". Run "npm run locales-translate" to re-translate them from the current en-US.`,
    );
}

run();

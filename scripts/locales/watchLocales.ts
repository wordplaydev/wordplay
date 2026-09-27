/**
 * Dev-only: keep the running app's locale data in step with the files being edited.
 *
 * The app never reads a locale's `sections/`. `DefaultLocale` imports the *assembled*
 * `src/locale/en-US.json`, every other locale fetches its assembled `<code>.json`, and
 * `npm run dev` is bare `vite dev` with no locale step — so a section edit was invisible
 * until someone remembered `npm run locales-assemble`, and an assembly left behind by an
 * old `postinstall` silently served text from whenever that ran.
 *
 * This assembles the one locale that changed, which is ~100ms against ~2.5s for all 31
 * (Prettier is over 90% of that cost, and the full run pays it even when nothing changed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { tsImport } from 'tsx/esm/api';
import type { Plugin, ViteDevServer } from 'vite';
import type * as LocaleFilesModule from '../../src/util/verify-locales/localeFiles.ts';
import type LogClass from '../../src/util/verify-locales/Log.ts';

/**
 * A changed file's locale, or undefined when it is nothing this rebuilds.
 *
 * Only a **section** counts. The assembled documents are what this writes, so reacting to
 * them would make the plugin answer its own writes; and en-US is the asymmetry —
 * its sections live under `src/locale/`, singular, which is exactly the substring the
 * previous version of this plugin tested for and therefore never matched.
 */
export function sectionLocaleOf(file: string): string | undefined {
    const parts = file.split(path.sep);
    const sections = parts.lastIndexOf('sections');
    if (sections < 1 || sections !== parts.length - 2) return undefined;
    if (!(parts[parts.length - 1] ?? '').endsWith('.json')) return undefined;
    return parts[sections - 1];
}

/**
 * A changed file's locale when the file is one the app fetches whole — a tutorial, a
 * how-to, an emoji or updates bundle. Nothing to rebuild; the browser just has to be told.
 *
 * The assembled `<code>.json` is excluded, and that exclusion is the whole reason this is
 * a named function with a test. It is what this plugin *writes*, and `writeAssembled`
 * renames a temp file into place, so without the exclusion every rebuild announced itself
 * a second time — the browser refetching a locale to be told what it had just been told.
 */
/** Whether a changed file is a tutorial, which is the one fetched bundle with a way to
 *  invalidate its own cache (the learn page refetches it with `refresh: true`). */
export function isTutorial(file: string): boolean {
    const last = file.split(path.sep)[file.split(path.sep).length - 1] ?? '';
    return /-tutorial(-[a-z]+)?\.json$/.test(last);
}

/** What a changed file asks of the browser. */
type Work = 'assemble' | 'swap' | 'reload';

export function fetchedLocaleOf(file: string): string | undefined {
    const parts = file.split(path.sep);
    const locales = parts.lastIndexOf('locales');
    // static/locales/<code>/… , and not a section (which the caller handles first).
    if (locales < 0 || parts.length < locales + 3) return undefined;
    if (parts.includes('sections')) return undefined;
    const locale = parts[locales + 1];
    const last = parts[parts.length - 1] ?? '';
    if (!last.endsWith('.json') && !last.endsWith('.txt')) return undefined;
    if (last === `${locale}.json`) return undefined;
    return locale;
}

/** The locale tooling, loaded through tsx because Vite's config bundler does not apply
 *  the app's `@util` alias and `localeFiles` reaches two modules through it. Cached, so
 *  the loader starts once per dev server rather than once per keystroke. */
let tooling:
    | Promise<{
          files: typeof LocaleFilesModule;
          Log: new () => LogClass;
      }>
    | undefined;

function getTooling() {
    if (tooling === undefined)
        tooling = Promise.all([
            tsImport(
                '../../src/util/verify-locales/localeFiles.ts',
                import.meta.url,
            ),
            tsImport('../../src/util/verify-locales/Log.ts', import.meta.url),
        ]).then(([files, log]) => ({ files, Log: log.default }));
    return tooling;
}

/**
 * Whether every one of this locale's sections is present and currently parses.
 *
 * `readLocale` treats a section it cannot read as *absent* and assembles the rest, and a
 * locale missing a key does not fall back — it crashes the page. Two ways to land there:
 * a write is not atomic, so a watcher can see a file mid-write; and a section that is
 * missing outright (every locale ships all eight, which `localeDirectoryFiles.test.ts`
 * enforces) would quietly assemble a document without it. So a round that cannot read
 * everything does nothing and waits for the next event, which a completed write is about
 * to send anyway.
 */
function sectionsReadable(
    directory: string,
    expected: readonly string[],
): boolean {
    for (const name of expected) {
        const file = path.join(directory, name);
        if (!fs.existsSync(file)) return false;
        try {
            JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
            return false;
        }
    }
    return true;
}

/** Rebuild one locale's assembled document. Returns whether the bytes actually changed —
 *  `writeFormatted` compares against disk and skips an identical write, which is what
 *  keeps this from priming a watcher loop with its own output. */
async function assemble(locale: string): Promise<boolean> {
    const { files, Log } = await getTooling();
    const directory = path.join(files.getLocaleDirectory(locale), 'sections');
    if (
        !fs.existsSync(directory) ||
        !sectionsReadable(directory, files.LocaleSections)
    )
        return false;
    const log = new Log();
    const text = files.readLocale(log, locale);
    if (text === undefined) return false;
    return files.writeAssembled(log, locale, text);
}

/**
 * Assemble any locale whose sections are newer than its assembled document.
 *
 * This, rather than the watching, is what fixes the case that prompted all of it: a dev
 * server started against an artifact from an old `postinstall` shows old text, and no
 * amount of watching notices, because the edit happened while nothing was running.
 */
async function assembleStale(locales: string[]): Promise<string[]> {
    const { files } = await getTooling();
    const stale: string[] = [];
    for (const locale of locales) {
        const assembled = files.getMonolithPath(locale);
        const assembledAt = fs.existsSync(assembled)
            ? fs.statSync(assembled).mtimeMs
            : 0;
        const directory = path.join(
            files.getLocaleDirectory(locale),
            'sections',
        );
        if (!fs.existsSync(directory)) continue;
        const newest = fs
            .readdirSync(directory)
            .filter((name) => name.endsWith('.json'))
            .reduce(
                (latest, name) =>
                    Math.max(
                        latest,
                        fs.statSync(path.join(directory, name)).mtimeMs,
                    ),
                0,
            );
        if (newest > assembledAt && (await assemble(locale)))
            stale.push(locale);
    }
    return stale;
}

/** Every locale that has sections to assemble. en-US's live in `src/locale/`, so it is
 *  named rather than discovered. */
async function locales(): Promise<string[]> {
    const { files } = await getTooling();
    const directory = path.join('static', 'locales');
    const found = fs.existsSync(directory) ? fs.readdirSync(directory) : [];
    return ['en-US', ...found]
        .filter((locale, index, all) => all.indexOf(locale) === index)
        .filter((locale) => files.hasSections(locale));
}

export default function watchLocales(): Plugin {
    // The dev server only. `vite build` already runs `locales-assemble` ahead of it, and
    // `vitest.config.ts` merges this config into all three test projects, where Vitest runs
    // its own server in *serve* mode: there `tsImport` put tsx's loader into the test process,
    // which on Node 22.23 fails every run at startup resolving `node:os`.
    return {
        name: 'wordplay-watch-locales',
        apply: (_config, env) =>
            env.command === 'serve' &&
            env.mode !== 'test' &&
            process.env.VITEST === undefined,
        async configureServer(server: ViteDevServer) {
            const rebuilt = await assembleStale(await locales()).catch(
                (error: unknown) => {
                    server.config.logger.warn(
                        `[locales] could not assemble at startup: ${String(error)}`,
                    );
                    return [];
                },
            );
            if (rebuilt.length > 0)
                server.config.logger.info(
                    `[locales] assembled ${rebuilt.join(', ')} from newer sections`,
                );

            // One save can emit several events — a truncate and a write, or the
            // unlink/add pair an editor that writes through a temp file produces. Two
            // things keep that to one announcement: a debounce, and a per-locale chain,
            // because an event arriving *while* an assemble is in flight would otherwise
            // read the half-written file and announce a second time.
            const pending = new Map<string, ReturnType<typeof setTimeout>>();
            const running = new Map<string, Promise<void>>();

            function schedule(locale: string, work: Work) {
                const existing = pending.get(locale);
                if (existing !== undefined) clearTimeout(existing);
                pending.set(
                    locale,
                    setTimeout(() => {
                        pending.delete(locale);
                        const next = (running.get(locale) ?? Promise.resolve())
                            .then(() => announce(locale, work))
                            .finally(() => {
                                if (running.get(locale) === next)
                                    running.delete(locale);
                            });
                        running.set(locale, next);
                    }, 100),
                );
            }

            async function announce(locale: string, work: Work) {
                try {
                    if (work === 'assemble' && !(await assemble(locale)))
                        return;
                    server.config.logger.info(`[locales] ${locale} updated`);
                    // A swap is only possible for something with a way to invalidate its
                    // cache, and only the assembled locale document has one. en-US does
                    // not even have that — it is a bundled module import, which nothing
                    // fetched can reach. Everything else reloads, which costs the page's
                    // state and is the honest answer rather than a silent no-op.
                    if (work !== 'reload' && locale !== 'en-US')
                        server.ws.send({
                            type: 'custom',
                            event: 'locales-update',
                            data: { locale },
                        });
                    else server.ws.send({ type: 'full-reload' });
                } catch (error: unknown) {
                    server.config.logger.warn(
                        `[locales] could not update ${locale}: ${String(error)}`,
                    );
                }
            }

            function changed(file: string) {
                const section = sectionLocaleOf(file);
                if (section !== undefined) return schedule(section, 'assemble');
                const fetched = fetchedLocaleOf(file);
                if (fetched === undefined) return;
                // A tutorial is the one other thing with a refresh path: the learn page
                // refetches it on this event, bypassing its own cache. A how-to, an emoji
                // set or an updates bundle has none, so those reload.
                schedule(fetched, isTutorial(file) ? 'swap' : 'reload');
            }

            server.watcher.on('change', changed);
            server.watcher.on('add', changed);
        },
    };
}

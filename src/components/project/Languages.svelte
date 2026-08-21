<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import TranslationMeter from '@components/app/TranslationMeter.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import LocaleName from '@components/settings/LocaleName.svelte';
    import LocaleSearch, {
        filterLocalesByQuery,
    } from '@components/settings/LocaleSearch.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Tabbed from '@components/widgets/Tabbed.svelte';
    import { LanguagesDialogID } from '@components/widgets/dialogIDs';
    import { Locales as LocalesDB, locales } from '@db/Database';
    import {
        budget,
        remaining,
        resetTranslationRefusal,
    } from '@db/translationBudget.svelte';
    import {
        getAnnouncer,
        getUser,
        isAuthenticated,
    } from '@components/project/Contexts';
    import { getFunctionsInstance } from '@db/firebase';
    import type Project from '@db/projects/Project';
    import { Projects } from '@db/projects/Projects';
    import translateProject from '@db/projects/translate';
    import getTranslatableLocales from '@locale/getTranslatableLocales';
    import { getLanguageName } from '@locale/LanguageCode';
    import type LocaleText from '@locale/LocaleText';
    import {
        localesAreEqual,
        localeToString,
        stringToLocale,
        type Locale,
    } from '@locale/Locale';
    import {
        findLocalesNaming,
        findLocalesWithKeyword,
        loadLocaleNameIndex,
    } from '@locale/localeNameIndex';
    import { SupportedLocales } from '@locale/SupportedLocales';
    import type { SupportedLocale } from '@locale/SupportedLocales';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Reference from '@nodes/Reference';
    import {
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        LOCALE_SYMBOL,
    } from '@parser/Symbols';

    interface Props {
        project: Project;
        /** A callback to show all of the languages, so we can make them visible if editors are hiding them. */
        showAll: () => void;
    }

    let { project, showAll }: Props = $props();

    let translating: boolean = $state(false);
    let error: boolean = $state(false);
    let show: boolean = $state(false);

    const announce = getAnnouncer();
    const user = getUser();

    /** What the translation is doing right now, so the dialog says something
     *  more useful than "loading" while a long job runs. */
    let progress = $state<
        | { kind: 'phase'; phase: 'analyzing' | 'revising' }
        | { kind: 'translating'; done: number; total: number; kept: number }
        | undefined
    >(undefined);

    /** How many strings kept their original words, known once translating ends. */
    let kept = $state(0);

    /** Whether translating adds the language alongside what the creator wrote
     *  (0, the default) or rewrites the project in it (1). Adding is the
     *  default because it's the one that can't lose anything. */
    let mode = $state(0);
    const RewriteMode = 1;

    /** Nothing left to spend today, so there's no point starting. */
    let spent = $derived(remaining() === 0);

    /** Clear a stale failure whenever the dialog opens: it used to persist for
     *  the life of the component, so one failure looked permanent. */
    $effect(() => {
        if (show) {
            error = false;
            resetTranslationRefusal();
        }
    });

    /** Index into the tab labels; see `ui.project.dialog.languages.tab`. */
    let tab = $state(0);
    /** The tab holding the languages the project is written in, and what it may be missing. */
    const WrittenInTab = 0;

    /** What the project declares, and how much of it the code actually needs. */
    let usage = $derived(project.getLocaleUsage());
    let unusedCount = $derived(usage.unused.length);

    /** Queries that filter the two language lists by native name, Latin name, or region. */
    let addQuery = $state('');
    let query = $state('');

    /** Languages the project could be written in but isn't yet. */
    let addable = $derived(
        filterLocalesByQuery(
            SupportedLocales.filter(
                (code) => !usage.declared.includes(code),
            ).map((code) => ({ code, locale: stringToLocale(code) })),
            addQuery,
            (item) => item.locale,
            $locales.getLanguages(),
        ),
    );

    let sourceLocale = $state<Locale | undefined>(undefined);
    let targetLocale = $state<Locale | undefined>(undefined);

    /** Default the translation source to the project's first language, following it as it changes. */
    $effect(() => {
        const first = usage.declared[0];
        if (sourceLocale === undefined && first !== undefined)
            sourceLocale = stringToLocale(first);
    });

    let destinationLocales = $derived(
        filterLocalesByQuery(
            getTranslatableLocales(),
            query,
            (locale) => locale,
            $locales.getLanguages(),
        ),
    );

    /**
     * Languages the project's code seems to be written in but doesn't declare. Names that
     * don't resolve and words that lex as plain names are checked against the generated word
     * → language index, so this doesn't have to load thirty locale bundles to answer. It's a
     * suggestion: nothing changes until someone adds a language.
     *
     * Grouped by language, with the words as evidence, because adding a language is the
     * action — a row per word repeats the same language and asks to be clicked twice.
     */
    let missing = $state<
        { code: SupportedLocale; words: string[] }[] | undefined
    >(undefined);

    /** Recheck whenever this tab is showing and the project changes. Gated on the tab as
     *  well as the dialog because it resolves every reference in every source. */
    $effect(() => {
        if (!show || tab !== WrittenInTab) return;
        const current = project;
        let stale = false;
        loadLocaleNameIndex().then((available) => {
            if (stale) return;
            missing = available ? findMissingLanguages(current) : [];
        });
        return () => {
            stale = true;
        };
    });

    function findMissingLanguages(project: Project) {
        const declared = new Set(project.getLocaleCodes());
        const byLocale = new Map<SupportedLocale, string[]>();
        const seen = new Set<string>();

        for (const source of project.getSources()) {
            const context = project.getContext(source);
            for (const reference of source.nodes(
                (n): n is Reference => n instanceof Reference,
            )) {
                // Only names that don't resolve; anything bound is by definition not missing.
                if (reference.resolve(context) !== undefined) continue;
                const word = reference.getName();
                if (word.length === 0 || seen.has(word)) continue;
                seen.add(word);

                // A word can also be a keyword the project's languages don't recognize, in
                // which case it degrades to a plain name and fails to resolve just the same.
                // English names bind everywhere through the locale fallback, so English is
                // never the missing *name* language — but its keyword words aren't universal,
                // since the keyword index is built from the declared locales alone.
                const candidates = new Set([
                    ...(findLocalesNaming(word) ?? []).filter(
                        (code) => code !== 'en-US',
                    ),
                    ...(findLocalesWithKeyword(word) ?? []),
                ]);
                for (const code of candidates) {
                    if (declared.has(code)) continue;
                    const words = byLocale.get(code);
                    if (words === undefined) byLocale.set(code, [word]);
                    else words.push(word);
                }
            }
        }

        // Most words first: the language that explains the most is the likeliest one.
        return Array.from(byLocale, ([code, words]) => ({ code, words })).sort(
            (a, b) => b.words.length - a.words.length,
        );
    }

    /** Declare a language, loading its text so its names bind right away. */
    async function addLocale(code: SupportedLocale) {
        const text = await LocalesDB.loadLocale(code, false);
        if (text === undefined) return;
        Projects.reviseProject(project.withLocales([text]));
        addQuery = '';
    }

    /** Translate the project into another language */
    async function translate() {
        const functions = await getFunctionsInstance();
        if (functions === undefined || !sourceLocale || !targetLocale) return;

        const target = targetLocale;

        error = false;
        resetTranslationRefusal();
        kept = 0;
        translating = true;
        progress = { kind: 'phase', phase: 'analyzing' };

        const revisedProject = await translateProject(
            functions,
            project,
            sourceLocale,
            target,
            mode === RewriteMode,
            (strings) => announcePlan(strings),
            (update) => {
                progress = update;
                if (update.kind === 'translating') {
                    kept = update.kept;
                    // Every announcement here has to differ from the last, or
                    // the live region says it once and then stays silent. The
                    // counts are what change, so they carry the message.
                    announceProgress(update.done, update.total);
                }
            },
        );

        translating = false;
        progress = undefined;

        if (revisedProject) {
            Projects.reviseProject(revisedProject);
            announceDone(target);
            showAll();
            show = false;
            targetLocale = undefined;
        } else {
            error = true;
            announceFailure();
        }
    }

    /** The target language's own name, for an announcement that names it. */
    function languageName(locale: Locale) {
        return getLanguageName(locale.language) ?? localeToString(locale);
    }

    /** Announcements are primary-locale-only: the live region speaks in one
     *  voice, and a joined string would read every language back to back. */
    function say(kind: 'translation' | 'translation-progress', text: string) {
        if (announce && $announce)
            $announce(kind, $locales.getLanguages()[0], text);
    }

    function announcePlan(strings: number) {
        if (targetLocale === undefined) return;
        say(
            'translation',
            $locales
                .concretize((l) => l.ui.translation.started, {
                    count: strings,
                    language: languageName(targetLocale),
                })
                .toText(),
        );
    }

    function announceProgress(done: number, total: number) {
        say(
            'translation-progress',
            $locales
                .concretize((l) => l.ui.translation.progress, {
                    done: `${done}`,
                    total,
                })
                .toText(),
        );
    }

    function announceDone(locale: Locale) {
        say(
            'translation',
            kept > 0
                ? $locales
                      .concretize((l) => l.ui.translation.finishedPartial, {
                          language: languageName(locale),
                          kept,
                      })
                      .toText()
                : $locales
                      .concretize((l) => l.ui.translation.finished, {
                          language: languageName(locale),
                      })
                      .toText(),
        );
    }

    function announceFailure() {
        say(
            'translation',
            $locales.getPrimaryPlainText((l) => l.ui.project.error.translate),
        );
    }
</script>

<Dialog
    id={LanguagesDialogID}
    bind:show
    height="75vh"
    header={(l) => l.ui.project.dialog.languages.header}
    explanation={(l) => l.ui.project.dialog.languages.explanation}
    button={{
        tip: (l) => l.ui.project.button.languages,
        icon: LOCALE_SYMBOL,
        // With one language a count says nothing a creator doesn't know, so the
        // button asks a question instead: translate. Past one, the count is the
        // useful thing — a project carrying seven languages it doesn't use says so.
        label:
            usage.declared.length === 1
                ? (l: LocaleText) => l.ui.project.dialog.languages.prompt
                : $locales
                      .concretize((l) => l.ui.project.dialog.languages.count, {
                          count: usage.declared.length,
                      })
                      .toText(),
        background: true,
    }}
    pinned
>
    <Tabbed
        id="languages-tabs"
        tabs={(l) => l.ui.project.dialog.languages.tab}
        choice={tab}
        select={(choice) => (tab = choice)}
    >
        {#snippet children()}
            {#if tab === WrittenInTab}
                <!-- No header here: the tab already names the section. -->
                {@render writtenIn()}
            {:else}
                {@render translation()}
            {/if}
        {/snippet}
    </Tabbed>
</Dialog>

{#snippet writtenIn()}
    <MarkupHTMLView markup={(l) => l.ui.project.dialog.languages.meaning}
    ></MarkupHTMLView>
    <div class="options">
        {#each usage.declared as code, index}
            {@const unused = usage.unused.includes(code)}
            {@const unloaded = usage.unloaded.includes(code)}
            <!-- The chip itself makes a language first, the way the source picker below
                 works, rather than a separate glyph — a ✓ beside a language reads as
                 "selected", which is not what promoting it means. -->
            <div
                class="option"
                class:selected={index === 0}
                aria-current={index === 0 ? 'true' : undefined}
            >
                {#if index === 0}<span class="check" aria-hidden="true"
                        >{CONFIRM_SYMBOL}</span
                    >{/if}
                <Button
                    tip={(l) => l.ui.project.button.firstLanguage}
                    active={index > 0}
                    action={() => {
                        const text = project
                            .getLocaleTexts()
                            .find((l) => localeToString(l) === code);
                        if (text)
                            Projects.reviseProject(
                                project.withPrimaryLocale(text),
                            );
                    }}
                    ><LocaleName
                        locale={code}
                        supported
                        showDraft={false}
                    /></Button
                >
                {#if unloaded}
                    <span class="status"
                        ><LocalizedText
                            path={(l) => l.ui.project.dialog.languages.unloaded}
                        /></span
                    >
                {:else if unused}
                    <span class="status"
                        ><LocalizedText
                            path={(l) => l.ui.project.dialog.languages.unused}
                        /></span
                    >
                {/if}
                {#if usage.declared.length > 1}
                    <Button
                        tip={(l) => l.ui.project.button.removeLanguage}
                        action={() => {
                            Projects.reviseProject(
                                project.withoutLocales([code]),
                            );
                        }}>{CANCEL_SYMBOL}</Button
                    >
                {/if}
            </div>
        {/each}
        {#if unusedCount > 0 && usage.declared.length > unusedCount}
            <Button
                background
                tip={(l) => l.ui.project.button.removeUnusedLanguages.tip}
                label={(l) => l.ui.project.button.removeUnusedLanguages.label}
                action={() => {
                    Projects.reviseProject(
                        project.withoutLocales(usage.unused),
                    );
                }}
            ></Button>
        {/if}
    </div>
    <div class="header-row">
        <LocaleSearch
            id="project-language-search"
            placeholder={(l) =>
                l.ui.project.dialog.languages.search.placeholder}
            description={(l) =>
                l.ui.project.dialog.languages.search.description}
            bind:query={addQuery}
        />
    </div>
    <div class="options">
        {#each addable as { code }}
            <Button
                tip={(l) => l.ui.project.button.addLanguage}
                action={() => addLocale(code)}
                background
                ><LocaleName
                    locale={code}
                    supported
                    showDraft={false}
                /></Button
            >
        {:else}&mdash;
        {/each}
    </div>

    <Subheader text={(l) => l.ui.project.subheader.missing} />
    {#if missing === undefined}
        <MarkupHTMLView markup={(l) => l.ui.project.dialog.languages.checking}
        ></MarkupHTMLView>
    {:else if missing.length === 0}
        <MarkupHTMLView markup={(l) => l.ui.project.dialog.languages.complete}
        ></MarkupHTMLView>
    {:else}
        <div class="options">
            {#each missing as { code, words }}
                <div class="option">
                    <Button
                        tip={(l) => l.ui.project.button.addLanguage}
                        action={() => addLocale(code)}
                        background
                        ><LocaleName
                            locale={code}
                            supported
                            showDraft={false}
                        /></Button
                    >
                    <!-- The names that only this language spells that way, as the evidence
                         for adding it. -->
                    <span class="words"
                        >{#each words.slice(0, 5) as word}<code>{word}</code
                            >{/each}{#if words.length > 5}…{/if}</span
                    >
                </div>
            {/each}
        </div>
    {/if}
{/snippet}

{#snippet translation()}
    {#if !isAuthenticated($user)}
        <!-- The budget is per creator, so translating can only be offered to
             one. Explaining beats a disabled button with no reason. -->
        <MarkupHTMLView markup={(l) => l.ui.translation.signIn} />
    {:else}
        <Subheader text={(l) => l.ui.project.subheader.source} />
        <div class="options">
            {#each usage.declared as code}
                {@const locale = stringToLocale(code)}
                {@const isSelected =
                    locale !== undefined &&
                    sourceLocale !== undefined &&
                    localesAreEqual(locale, sourceLocale)}
                <div
                    class="option"
                    class:selected={isSelected}
                    aria-current={isSelected ? 'true' : undefined}
                >
                    {#if isSelected}<span class="check" aria-hidden="true"
                            >{CONFIRM_SYMBOL}</span
                        >{/if}
                    <Button
                        action={() => {
                            sourceLocale = stringToLocale(code);
                        }}
                        active={!translating && !isSelected}
                        tip={(l) => l.ui.project.button.primary}
                        background
                        ><LocaleName
                            locale={code}
                            supported
                            showDraft={false}
                        /></Button
                    >
                </div>
            {/each}
        </div>
        <!-- What translating should do, before choosing where to translate to:
             it changes what the result looks like, not just the language. -->
        <div class="header-row">
            <Mode
                modes={(l) => l.ui.project.dialog.languages.mode}
                choice={mode}
                select={(choice) => (mode = choice)}
                active={!translating}
                labeled
                modeLabels
            />
        </div>
        <div class="header-row">
            <Subheader text={(l) => l.ui.project.subheader.destination} />
            <LocaleSearch
                id="translate-destination-search"
                placeholder={(l) =>
                    l.ui.project.dialog.languages.search.placeholder}
                description={(l) =>
                    l.ui.project.dialog.languages.search.description}
                bind:query
            />
            <!-- Once a target is chosen there is one thing left to do, so the
             button says so by becoming salient rather than merely enabled. -->
            <Button
                background={targetLocale !== undefined &&
                sourceLocale !== undefined &&
                !translating &&
                !spent
                    ? 'salient'
                    : true}
                loading={translating}
                action={() => {
                    translate();
                }}
                active={targetLocale !== undefined &&
                    sourceLocale !== undefined &&
                    !translating &&
                    !spent}
                tip={(l) => l.ui.project.button.translate.tip}
                label={(l) => l.ui.project.button.translate.label}
            ></Button>
            <TranslationMeter />
        </div>
        {#if translating}
            {@const done =
                progress?.kind === 'translating' ? progress.done : undefined}
            {@const total =
                progress?.kind === 'translating' ? progress.total : undefined}
            <div class="progress">
                {#if done !== undefined && total !== undefined && total > 0}
                    <MarkupHTMLView
                        inline
                        markup={[
                            (l) => l.ui.translation.progress,
                            { done: `${done}`, total },
                        ]}
                    />
                {:else}
                    <MarkupHTMLView
                        inline
                        markup={progress?.kind === 'phase' &&
                        progress.phase === 'revising'
                            ? (l) => l.ui.translation.revising
                            : (l) => l.ui.translation.analyzing}
                    />
                {/if}
                <!-- Two bars: what is done, and a sweep over it. The sweep animates
                 `transform`, which the compositor runs, so it keeps moving
                 while the main thread is busy rebuilding the project — a
                 percentage that stops updating reads as a hung page. -->
                <div
                    class="track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={done !== undefined &&
                    total !== undefined &&
                    total > 0
                        ? Math.round((done / total) * 100)
                        : 0}
                    aria-label={$locales.getPrimaryPlainText(
                        (l) => l.ui.translation.progressLabel,
                    )}
                >
                    <div
                        class="done"
                        style:width="{done !== undefined &&
                        total !== undefined &&
                        total > 0
                            ? Math.round((done / total) * 100)
                            : 0}%"
                    ></div>
                    <div class="sweep"></div>
                </div>
            </div>
        {/if}
        {#if error}
            <!-- Which failure it was, since they call for different responses. An
             exhausted budget isn't repeated here: the meter above already says
             it, and says when it resets. -->
            {#if budget.refusal === 'unauthenticated'}
                <Notice
                    ><MarkupHTMLView
                        markup={(l) => l.ui.translation.signIn}
                    /></Notice
                >
            {:else if budget.refusal !== 'over-budget'}
                <Notice
                    text={budget.refusal === undefined
                        ? (l) => l.ui.project.error.translateBroken
                        : (l) => l.ui.project.error.translate}
                />
            {/if}
        {/if}
        <div class="options">
            {#each destinationLocales as locale}
                {@const isSelected =
                    targetLocale !== undefined &&
                    localesAreEqual(targetLocale, locale)}
                <div
                    class="option"
                    class:selected={isSelected}
                    aria-current={isSelected ? 'true' : undefined}
                >
                    {#if isSelected}<span class="check" aria-hidden="true"
                            >{CONFIRM_SYMBOL}</span
                        >{/if}
                    <Button
                        action={() => {
                            targetLocale = locale;
                        }}
                        active={!translating &&
                            (targetLocale === undefined ||
                                !localesAreEqual(targetLocale, locale)) &&
                            (sourceLocale === undefined ||
                                !localesAreEqual(sourceLocale, locale))}
                        tip={(l) => l.ui.project.button.destination}
                        background
                        ><LocaleName
                            locale={localeToString(locale)}
                            supported
                            showDraft={false}
                        /></Button
                    >
                </div>
            {:else}&mdash;
            {/each}
        </div>
    {/if}
{/snippet}

<style>
    .options {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
        row-gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
    }

    .header-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
    }

    .option {
        display: flex;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        border: var(--wordplay-focus-width) solid transparent;
        border-radius: var(--wordplay-border-radius);
    }

    /* Selected locales aren't clickable, so highlight them to show selection.
       Uses the highlight color; the focus color is reserved for focus. A ✓
       accompanies the border so selection doesn't ride on color alone. */
    .option.selected {
        border-color: var(--wordplay-highlight-color);
        padding-inline-start: var(--wordplay-spacing-half);
    }

    .option.selected :global(.language) {
        color: var(--wordplay-foreground) !important;
    }

    .status {
        font-style: italic;
        color: var(--wordplay-inactive-color);
        font-size: var(--wordplay-small-font-size);
    }

    .words {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing-half);
    }

    .progress {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
        padding: var(--wordplay-spacing);
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
    }

    .track {
        position: relative;
        overflow: hidden;
        width: 100%;
        height: var(--wordplay-focus-width);
        background: var(--wordplay-alternating-color);
        border-radius: var(--wordplay-border-radius);
    }

    .done {
        height: 100%;
        background: var(--wordplay-highlight-color);
    }

    /* Keeps moving on the compositor while the main thread rebuilds the
       project, so a busy moment doesn't look like a hung one. */
    .sweep {
        position: absolute;
        inset-block: 0;
        inset-inline-start: 0;
        width: 30%;
        background: var(--wordplay-highlight-color);
        opacity: 0.5;
        animation: sweep calc(var(--animation-factor) * 1.2s) linear infinite;
    }

    @keyframes sweep {
        from {
            transform: translateX(-100%);
        }
        to {
            transform: translateX(400%);
        }
    }

    /* The names are quoted from the creator's code, so they should read as code. */
    code {
        font-family: var(--wordplay-code-font);
        background: var(--wordplay-alternating-color);
        border-radius: var(--wordplay-border-radius);
        padding: 0 var(--wordplay-spacing-half);
    }
</style>

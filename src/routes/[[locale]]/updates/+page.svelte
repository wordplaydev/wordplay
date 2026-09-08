<script lang="ts">
    import PageHeader from '@components/app/PageHeader.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        setConceptPath,
        type ConceptPath,
    } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { locales, Settings } from '@db/Database';
    import loadUpdates from '@db/locales/loadUpdates';
    import versioned from '@db/locales/versioned';
    import localeToBCP47 from '@locale/localeToBCP47';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import {
        updateTextPath,
        UpdateSectionKinds,
        type UpdateSectionKind,
        type UpdatesBundle,
        type UpdateText,
    } from '@locale/UpdatesBundle';
    import { writable } from 'svelte/store';
    import date from './date.json';

    /** The release structure and its English markup, built from CHANGELOG.md by
     *  `npm run updates`. Fetched rather than imported: a static import put the
     *  whole changelog into all 32 prerendered copies of this page — 450KB each,
     *  the same English every time — which is 14MB of HTML to say one thing. */
    let bundle = $state<UpdatesBundle | undefined>(undefined);

    /** This locale's translations, keyed by entry id. Empty until they load, and
     *  empty for en-US, so an entry falls back to its English markup. */
    let translations = $state<Record<string, string>>({});

    /** Explicit accessors rather than one indexed by kind: a locale accessor is
     *  reflected by recording the property path it walks, and naming each key
     *  outright keeps that reflection exact. */
    const CategoryLabels: Record<UpdateSectionKind, LocaleTextAccessor> = {
        added: (l) => l.ui.page.updates.categories.added,
        changed: (l) => l.ui.page.updates.categories.changed,
        fixed: (l) => l.ui.page.updates.categories.fixed,
        removed: (l) => l.ui.page.updates.categories.removed,
    };

    let path = writable<ConceptPath>([]);
    setConceptPath(path);

    // The landing page's "new updates" badge compares against this. It comes
    // from date.json rather than the bundle so it stays synchronous.
    if (date.date !== null) Settings.setUpdatesLastChecked(date.date);

    $effect(() => {
        fetch(versioned('/updates.json'))
            .then(async (response) =>
                response.ok
                    ? ((await response.json()) as UpdatesBundle)
                    : undefined,
            )
            .then((loaded) => {
                if (loaded !== undefined) bundle = loaded;
            })
            .catch(() => undefined);
    });

    $effect(() => {
        loadUpdates($locales.getLocaleString()).then((loaded) => {
            translations = loaded;
        });
    });

    // Get the dated updates in reverse chronological order. A dateless heading
    // is a legacy `## 0.16.38`, which has no day to file it under.
    const releases = $derived(
        (bundle?.updates ?? [])
            .filter((update) => update.date !== null)
            .toSorted(
                (a, b) =>
                    // Add a time zone so sorting doesn't depend on the reader's.
                    new Date(`${b.date}T00:00:00`).getTime() -
                    new Date(`${a.date}T00:00:00`).getTime(),
            ),
    );

    /** Collapse state by version, so it survives the list arriving. Everything
     *  but the two most recent releases starts collapsed. */
    let toggled = $state<Record<string, boolean>>({});
    const isCollapsed = (version: string, index: number) =>
        toggled[version] ?? index > 1;

    /** Format the date in the language the reader chose, not the one their
     *  browser is set to. `localeToString` is Wordplay's own name for a locale
     *  and is not a BCP 47 tag, so `ta-IN-LK-SG` would throw. */
    const dateFormat = $derived.by(() => {
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };
        try {
            return new Intl.DateTimeFormat(
                localeToBCP47($locales.getLocale()),
                options,
            );
        } catch (_) {
            return new Intl.DateTimeFormat(undefined, options);
        }
    });

    /** This locale's text for an entry, or the English it was translated from. */
    const textOf = (text: UpdateText) => translations[text.id] ?? text.markup;
</script>

{#snippet prose(text: UpdateText)}
    <MarkupHTMLView
        markup={textOf(text)}
        overrideKey={updateTextPath(text.id)}
        sourceText={textOf(text)}
    />
{/snippet}

<Title text={(l) => l.ui.page.updates.header} />

<Writing reading>
    <PageHeader
        header={(l) => l.ui.page.updates.header}
        description={(l) => l.ui.page.updates.content}
    />

    {#each releases as update, index (update.version)}
        <div class="section">
            <Subheader>
                {dateFormat.format(new Date(`${update.date}T00:00:00`))}
                <Button
                    background
                    tip={isCollapsed(update.version, index)
                        ? (l) => l.ui.page.updates.tips.expand
                        : (l) => l.ui.page.updates.tips.collapse}
                    action={() =>
                        (toggled[update.version] = !isCollapsed(
                            update.version,
                            index,
                        ))}
                    >{#if isCollapsed(update.version, index)}+{:else}–{/if}</Button
                ></Subheader
            >

            {#if !isCollapsed(update.version, index)}
                {#if update.summary}{@render prose(update.summary)}{/if}
                {#each UpdateSectionKinds as kind (kind)}
                    {#if update.changes[kind].length > 0}
                        <h3 class={kind}
                            ><LocalizedText path={CategoryLabels[kind]}
                            ></LocalizedText></h3
                        >
                        <ul>
                            {#each update.changes[kind] as item (item.id)}
                                <!-- The emoji is a category marker rather than
                                     content, so it is never translated and never
                                     read aloud. -->
                                <li class:marked={item.emoji !== null}>
                                    {#if item.emoji}<span
                                            class="marker emoji"
                                            aria-hidden="true"
                                            >{item.emoji}</span
                                        >{/if}
                                    {@render prose(item)}
                                </li>
                            {/each}
                        </ul>
                        {#if update.summaries[kind]}
                            {@render prose(update.summaries[kind])}
                        {/if}
                    {/if}
                {/each}
            {/if}
        </div>
    {/each}
</Writing>

<style>
    .section {
        margin-top: 3em;
    }

    h3 {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        color: var(--wordplay-background);
        display: inline-block;
        font-weight: bold;
    }

    /* These pills carry white text (--wordplay-background), so their fills have
       to clear 4.5:1 against it in both schemes — which is what the AA `-text`
       variants are for, the way --wordplay-error already uses --color-orange-text
       as a background. The brand hues they replace are for backgrounds and
       borders that need 3:1 or nothing: --wordplay-focus-color measured 4.00
       light / 4.34 dark and --wordplay-warning 3.01 light. Pink and error pass
       as they are (4.54 / 7.19 and 5.30 / 6.85) and keep their semantic vars. */
    h3.added {
        background: var(--color-blue-text);
    }

    h3.changed {
        background: var(--wordplay-evaluation-color);
    }
    h3.removed {
        background: var(--color-gold-text);
    }
    h3.fixed {
        background: var(--wordplay-error);
    }

    ul {
        padding-inline-start: 1.5em;
        margin-inline-start: 0;
    }

    ul li + li {
        margin-block-start: calc(2 * var(--wordplay-spacing));
    }

    /* Marked entries pull back the ul's padding so the emoji sits flush
       with the rest of the page content (H3 labels, etc.). Unmarked
       legacy entries keep the gutter so their default bullet has room. */
    li.marked {
        list-style: none;
        display: flow-root;
        margin-inline-start: -1.5em;
    }

    .marker.emoji {
        float: inline-start;
        margin-inline-end: calc(2 * var(--wordplay-spacing));
        width: 3rem;
        height: 3rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.25rem;
        line-height: 1;
        background: transparent;
    }
</style>

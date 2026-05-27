<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { setConceptPath } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type Concept from '@concepts/Concept';
    import { Settings } from '@db/Database';
    import { writable } from 'svelte/store';
    import updates from './updates.json';

    // Get the dated updates in reverse chronological order.
    const datedUpdates = updates
        .filter((update) => update.date !== null)
        .map((update) => ({
            ...update,
            // Add a time zone to ensure consistent sorting regardless of the user's locale.
            date: update.date + 'T00:00:00',
        }))
        .toSorted((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

    let collapsed = $state<boolean[]>(
        datedUpdates.map((_, index) => index > 1),
    );

    let path = writable<Concept[]>([]);
    setConceptPath(path);

    Settings.setUpdatesLastChecked(datedUpdates[0].date.split('T')[0]);

    /** Convert a CHANGELOG bullet's text into Wordplay markup.
     *
     *  Markdown-style substitutions (`**`, `_`, `[…](…)`, `#N`) must NOT
     *  rewrite content inside backticks — `en_us` should round-trip
     *  unchanged. Pull every backtick span out into a placeholder first,
     *  apply the prose transforms, then restore each span as a Wordplay
     *  Example (`\…\`). */
    function toMarkup(text: string): string {
        const PLACEHOLDER = '';
        const spans: string[] = [];
        let body = text.replaceAll(/`(.+?)`/g, (_, code) => {
            spans.push(code);
            return `${PLACEHOLDER}${spans.length - 1}${PLACEHOLDER}`;
        });
        body = body
            // Escape literals of any markup symbol that we'll later
            // *introduce* via a substitution below, so a stray copy in the
            // source can't accidentally trigger that markup. Wordplay markup
            // escapes specials by doubling them — see
            // `unescapeMarkupSymbols`. Order matters: do these *before* the
            // substitutions that emit those symbols.
            //
            // `\` — guards against a runaway Example when placeholders are
            //   restored as `\…\`.
            // `/` — `_` → `/` italics conversion runs below; without
            //   escaping, a literal `/` (e.g., in paths or ratios) becomes
            //   an italic marker.
            .replaceAll('\\', '\\\\')
            .replaceAll('/', '//')
            .replaceAll('**', '*')
            .replaceAll('_', '/')
            .replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '<$1@$2>')
            .replaceAll(
                /#([0-9]+)/g,
                '<$1@https://github.com/wordplaydev/wordplay/issues/$1>',
            );
        return body.replaceAll(
            new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, 'g'),
            (_, idx) => `\\${spans[Number(idx)]}\\`,
        );
    }
</script>

{#snippet note(entry: { text: string; emoji: string | null })}
    <!-- Convert markdown into Wordplay markup -->
    <li class:marked={entry.emoji !== null}>
        {#if entry.emoji}
            <span class="marker emoji" aria-hidden="true">{entry.emoji}</span>
        {/if}
        <MarkupHTMLView markup={toMarkup(entry.text)} />
    </li>
{/snippet}

<Writing>
    <Header text={(l) => l.ui.page.updates.header}></Header>
    <MarkupHTMLView markup={(l) => l.ui.page.updates.content} />

    {#each datedUpdates as update, index}
        <div class="section">
            <Subheader>
                {new Date(update.date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                })}
                <Button
                    background
                    tip={collapsed[index]
                        ? (l) => l.ui.page.updates.tips.expand
                        : (l) => l.ui.page.updates.tips.collapse}
                    action={() => (collapsed[index] = !collapsed[index])}
                    >{#if collapsed[index]}+{:else}–{/if}</Button
                ></Subheader
            >

            {#if !collapsed[index]}
                {#if update.summary}
                    <MarkupHTMLView markup={toMarkup(update.summary)} />
                {/if}
                {#if update.changes.added.length > 0}
                    <h3 class="added"
                        ><LocalizedText
                            path={(l) => l.ui.page.updates.categories.added}
                        ></LocalizedText></h3
                    >
                    <ul>
                        {#each update.changes.added as item}
                            {@render note(item)}
                        {/each}
                    </ul>
                    {#if update.summaries?.added}
                        <MarkupHTMLView
                            markup={toMarkup(update.summaries.added)}
                        />
                    {/if}
                {/if}
                {#if update.changes.changed.length > 0}
                    <h3 class="changed"
                        ><LocalizedText
                            path={(l) => l.ui.page.updates.categories.changed}
                        ></LocalizedText></h3
                    >
                    <ul>
                        {#each update.changes.changed as item}
                            {@render note(item)}
                        {/each}
                    </ul>
                    {#if update.summaries?.changed}
                        <MarkupHTMLView
                            markup={toMarkup(update.summaries.changed)}
                        />
                    {/if}
                {/if}
                {#if update.changes.fixed.length > 0}
                    <h3 class="fixed"
                        ><LocalizedText
                            path={(l) => l.ui.page.updates.categories.fixed}
                        ></LocalizedText></h3
                    >
                    <ul>
                        {#each update.changes.fixed as item}
                            {@render note(item)}
                        {/each}
                    </ul>
                    {#if update.summaries?.fixed}
                        <MarkupHTMLView
                            markup={toMarkup(update.summaries.fixed)}
                        />
                    {/if}
                {/if}
                {#if update.changes.removed.length > 0}
                    <h3 class="removed"
                        ><LocalizedText
                            path={(l) => l.ui.page.updates.categories.removed}
                        ></LocalizedText></h3
                    >
                    <ul>
                        {#each update.changes.removed as item}
                            {@render note(item)}
                        {/each}
                    </ul>
                    {#if update.summaries?.removed}
                        <MarkupHTMLView
                            markup={toMarkup(update.summaries.removed)}
                        />
                    {/if}
                {/if}
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

    h3.added {
        background: var(--wordplay-focus-color);
    }

    h3.changed {
        background: var(--wordplay-evaluation-color);
    }
    h3.removed {
        background: var(--wordplay-warning);
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

<script lang="ts">
    import type MatchValue from '@values/MatchValue';

    /**
     * The view for a {@link MatchValue} — the scoped state of an in-progress
     * pattern match (`≈`/`⌕`). It renders the text being matched with the current
     * grapheme highlighted (matched/missed/scanning), the captures recorded so
     * far, and any quantifier tally, so stepping a match shows the position
     * advancing and groups filling in (LANGUAGE.md, the observable-stepwise
     * requirement).
     */
    interface Props {
        value: MatchValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();

    let match = $derived(value.value);
    let snapshot = $derived(match.snapshot);
    let position = $derived(snapshot?.pos ?? 0);
    // Split the text around the current grapheme so it can be highlighted.
    let before = $derived(match.graphemes.slice(0, position).join(''));
    let current = $derived(match.graphemes[position] ?? '');
    let after = $derived(match.graphemes.slice(position + 1).join(''));
    // 'hit' when the current beat matched, 'miss' when it didn't, '' otherwise
    // (a scan beat, or before any beat).
    let outcome = $derived(
        snapshot?.kind === 'atom' || snapshot?.kind === 'quantifier'
            ? snapshot.matched
                ? 'hit'
                : 'miss'
            : '',
    );
    let captures = $derived(snapshot ? [...snapshot.caps.entries()] : []);
</script>

<span class="match" class:inline>
    <span class="text"
        >{before}<span class="here {outcome}" aria-hidden="true">{current ||
                '▮'}</span
        >{after}</span
    >
    {#if snapshot?.kind === 'quantifier'}
        <span class="tally">×{snapshot.count ?? 0}</span>
    {/if}
    {#if captures.length > 0}
        <span class="captures">
            {#each captures as [name, capture] (name)}
                <span class="capture">{name}: “{capture.text}”</span>
            {/each}
        </span>
    {/if}
</span>

<style>
    .match {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0.25em;
        align-items: baseline;
        font-family: var(--wordplay-code-font);
    }
    .text {
        white-space: pre;
    }
    .here {
        border-bottom: 2px solid var(--wordplay-highlight-color);
    }
    .here.hit {
        background: var(--wordplay-highlight-color);
        color: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
    }
    .here.miss {
        background: var(--wordplay-error);
        color: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
    }
    .tally {
        opacity: 0.85;
    }
    .captures {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0.25em;
        opacity: 0.85;
    }
    .capture {
        padding: 0 0.25em;
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-alternating-color);
    }
</style>

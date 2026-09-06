<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import type LocaleText from '@locale/LocaleText';
    import { type HeaderAndExplanationText } from '@locale/UITexts';
    import Header from '@components/app/Header.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import type { Snippet } from 'svelte';

    interface Props {
        text: (l: LocaleText) => HeaderAndExplanationText;
        sub: boolean;
        /** Controls shown on the header's own line, e.g. the button that adds
         *  a thing to the section it names. */
        controls?: Snippet | undefined;
    }

    let { text, sub, controls }: Props = $props();
</script>

{#snippet heading()}
    {#if sub}
        <Subheader text={(l) => text(l).header}></Subheader>
    {:else}
        <Header text={(l) => text(l).header} />
    {/if}
{/snippet}

{#if controls}
    <!-- The heading is :first-child inside this row, so its own top margin
         collapses to nothing; the row carries it instead, keeping the rhythm
         between sections the same with controls as without. -->
    <div class="row" class:sub>
        {@render heading()}
        {@render controls()}
    </div>
{:else}
    {@render heading()}
{/if}
<MarkupHTMLView markup={(l) => text(l).explanation} />

<style>
    .row {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .row.sub {
        margin-block-start: 1.5em;
    }
</style>

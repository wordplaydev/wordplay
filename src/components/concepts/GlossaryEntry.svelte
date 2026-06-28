<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getTermDefinition } from '@locale/Glossary';

    /**
     * One glossary entry: the term's word as a subheader, then its definition.
     * The definition renders through MarkupHTMLView with a per-locale resolver,
     * so it echoes across the chosen languages (#780) and its `@term` /
     * `@Concept` references stay interactive. Shared by the glossary browse view
     * and the global-search results so a glossary match is recognizable.
     */
    let { id, word }: { id: string; word: string } = $props();
</script>

<div class="entry">
    <h3>{word}</h3>
    <MarkupHTMLView markup={{ perLocale: (l) => getTermDefinition(l, id) }} />
</div>

<style>
    .entry {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>

<script lang="ts">
    import HeaderAndExplanation from '@components/app/HeaderAndExplanation.svelte';
    import GlossaryEntry from '@components/concepts/GlossaryEntry.svelte';
    import { locales } from '@db/Database';

    /**
     * The Guide's glossary mode: every glossary term (word + definition),
     * alphabetized by the active locale's collation.
     */

    // Sort by the active locale's collation (Intl/ICU via localeCompare), so the
    // order is correct for non-Latin scripts too, not just alphabetical English.
    const terms = $derived(
        Object.keys($locales.getLocale().glossary)
            .map((id) => ({ id, word: $locales.getTermByID(id) ?? id }))
            .sort((a, b) =>
                a.word.localeCompare(b.word, $locales.getLanguages()),
            ),
    );
</script>

<div class="glossary">
    <HeaderAndExplanation text={(l) => l.ui.docs.glossary.explain} sub />
    {#each terms as term (term.id)}
        <GlossaryEntry id={term.id} word={term.word} />
    {/each}
</div>

<style>
    /* Dissolve this wrapper so the header, explanation, and entries are direct
       flex children of the documentation `.content` column, matching the spacing
       of the code and how-to sections. */
    .glossary {
        display: contents;
    }
</style>

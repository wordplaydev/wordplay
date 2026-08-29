<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import {
        getTermDefinition,
        getTermDefinitionString,
        getTermWordString,
    } from '@locale/Glossary';

    /**
     * One glossary entry: the term's word as a subheader, then its definition.
     * The definition renders through MarkupHTMLView with a per-locale resolver,
     * so it echoes across the chosen languages (#780) and its `@term` /
     * `@Concept` references stay interactive. Shared by the glossary browse view,
     * the global-search results, and the localization workspace's Glossary tab,
     * so a glossary match is recognizable wherever it appears.
     *
     * Both fields are editable in localization mode. Neither is read by an accessor that
     * names a place in the locale tree — both go through helpers that compute a string from
     * it, which is what `accessorToLocalePath` declines — so both use the explicit
     * `overrideKey` + `sourceText` pair instead, the same escape hatch tutorial dialog uses.
     * The source text is the raw annotated string: it seeds the editor and decides whether
     * the machine-translated badge shows.
     */
    let { id }: { id: string } = $props();

    const word = $derived(getTermWordString($locales.getLocale(), id));
    const definition = $derived(
        getTermDefinitionString($locales.getLocale(), id),
    );
</script>

<div class="entry">
    <h3>
        <LocalizedText overrideKey={`glossary.${id}.word`} sourceText={word} />
    </h3>
    <MarkupHTMLView
        markup={{ perLocale: (l) => getTermDefinition(l, id) }}
        overrideKey={`glossary.${id}.definition`}
        sourceText={definition}
    />
</div>

<style>
    .entry {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>

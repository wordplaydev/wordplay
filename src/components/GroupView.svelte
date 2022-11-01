<script lang="ts">
    import List from "../runtime/List";
    import Structure from "../runtime/Structure";
    import PhraseView from "./PhraseView.svelte";

    export let group: Structure;
    const layoutStructure = group.resolve("layout");
    const layout = layoutStructure instanceof Structure ? `layout-${layoutStructure.type.names.getTranslations().eng}` : "layout-Vertical";
    $: phraseStructure = group.resolve("phrases");
    $: phrases = phraseStructure instanceof List ? phraseStructure.getValues() : undefined;

</script>

<div class={layout}>
    {#if phrases === undefined}
        Group doesn't have phrases
    {:else}
        {#each phrases as phrase (phrase.creator.id)}
            {#if phrase instanceof Structure }
                <PhraseView phrase={phrase} />
            {:else}
                {phrase.constructor.name}
            {/if}
        {/each}
    {/if}
</div>

<style>

    /* A horizontally centered vertical layout that justifies its vertical content. */
    .layout-Vertical {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1em;
    }

</style>
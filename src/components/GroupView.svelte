<script lang="ts">
    import { onMount } from "svelte";
    import List from "../runtime/List";
    import Structure from "../runtime/Structure";
    import PhraseView from "./PhraseView.svelte";

    export let group: Structure;
    const layoutStructure = group.resolve("layout");
    const layout = layoutStructure instanceof Structure ? `layout-${layoutStructure.type.names.getTranslations().eng}` : "layout-default";
    $: phraseStructure = group.resolve("phrases");
    $: phrases = phraseStructure instanceof List ? phraseStructure.getValues() : undefined;

    let visible = false;
    onMount(() => visible = true);

</script>

{#if visible}
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
{/if}

<style>

    /* A horizontally centered vertical layout */
    .layout-Vertical {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1em;
    }

</style>
<script lang="ts">
    import List from "../runtime/List";
    import Structure from "../runtime/Structure";
    import PhraseView from "./PhraseView.svelte";

    export let group: Structure;
    const layoutStructure = group.resolve("layout");
    const layout = layoutStructure instanceof Structure ? `layout-${layoutStructure.type.aliases[0].getName()}` : "layout-default";
    $: phraseStructure = group.resolve("phrases");
    $: phrase = phraseStructure instanceof List ? phraseStructure.getValues() as Structure[] : [];

</script>

<div class={layout}>
    {#each phrase as lets}
        <PhraseView phrase={lets} />
    {/each}
</div>

<style>

    /* A horizontally centered vertical layout */
    .layout-Vertical {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1em;
    }

</style>
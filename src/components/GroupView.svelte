<script lang="ts">
    import List from "../runtime/List";
    import Structure from "../runtime/Structure";
    import LettersView from "./LettersView.svelte";

    export let group: Structure;
    const layoutStructure = group.resolve("layout");
    const layout = layoutStructure instanceof Structure ? `layout-${layoutStructure.type.aliases[0].getName()}` : "layout-default";
    $: lettersStructure = group.resolve("letters");
    $: letters = lettersStructure instanceof List ? lettersStructure.getValues() as Structure[] : [];

</script>

<div class={layout}>
    {#each letters as lets}
        <LettersView letters={lets} />
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
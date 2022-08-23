<script lang="ts">
import type List from "../runtime/List";

    import Structure from "../runtime/Structure";
    import SentenceView from "./SentenceView.svelte";

    export let group: Structure;
    const layoutStructure = group.resolve("layout");
    const layout = layoutStructure instanceof Structure ? `layout-${layoutStructure.type.aliases[0].getName()}` : "layout-default";
    $: sentences = (group.resolve("sentences") as List).getValues() as Structure[];

</script>

<div class={layout}>
    {#each sentences as sentence}
        <SentenceView sentence={sentence} />
    {/each}
</div>

<style>

    .layout-default {


    }

    /* A horizontally centered vertical layout */
    .layout-Vertical {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1em;
    }

</style>
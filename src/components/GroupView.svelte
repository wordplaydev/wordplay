<svelte:options immutable={true}/>

<script lang="ts">
    import type { Group } from "../native/Group";
    import PhraseView from "./PhraseView.svelte";

    export let group: Group;

</script>

<div class="layout-Vertical">
    {#each group.phrases as phrase }
        <PhraseView {phrase} />
    {/each}
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
<script lang="ts">
    import type ConstructConcept from "../concepts/ConstructConcept";
    import CodeView from "./CodeView.svelte";

    export let concepts: ConstructConcept[];

</script>

<h2>code</h2>
<div class="group">
    {#each concepts as concept}
        <CodeView {concept} node={concept.template} />
    {/each}
</div>

<style>
    .group {
        margin: var(--wordplay-spacing);
        display: flex;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }
</style>
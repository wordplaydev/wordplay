<script lang="ts">
    import type Concept from "../concepts/Concept";
    import CodeView from "./CodeView.svelte";

    export let category: string;
    export let concepts: Concept[];

</script>

<h2>{category}</h2>
<div class="group {category}">
    {#each concepts as concept}
        <CodeView {concept} node={concept.getRepresentation()} selectable/>
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
<script lang="ts">
    import type { TypeCategory, TypeEntry } from "./TypeEntries";
    import Type from "./TypeNameView.svelte";

    export let category: TypeCategory;
    export let entries: TypeEntry[];

</script>

<h2>{category}</h2>
<div class="group {category}">
    {#each entries as entry}
        <Type {entry} on:selected />
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
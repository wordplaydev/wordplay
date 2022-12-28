<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type { ConstructEntry } from "./ConstructEntries";

    export let entries: ConstructEntry[];

</script>

<h2>code</h2>
<div class="group">
    {#each entries as entry}
        <CodeView  node={entry.example} />
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
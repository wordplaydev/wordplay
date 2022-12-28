<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type { TypeEntry } from "./TypeEntries";

    export let entry: TypeEntry;

</script>

<p>
    <CodeView node={entry.name}/>
</p>

{#each entry.creators as creator }    
    <CodeView node={creator}/>
{/each}

{#each entry.constructs as node }
    <CodeView {node}/>
{/each}

{#each entry.functions as node }
    <CodeView {node}/>
{/each}
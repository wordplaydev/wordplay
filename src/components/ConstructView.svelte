<script lang="ts">
    import CodeEntry from "./CodeView.svelte";
    import type { ConstructEntry } from "./ConstructEntries";

    export let entry: ConstructEntry;
    
</script>

<p>
    <CodeEntry node={entry.example}/>
</p>
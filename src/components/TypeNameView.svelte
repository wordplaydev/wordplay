<script lang="ts">
    import type { TypeEntry } from "./TypeEntries";
    import { createEventDispatcher } from "svelte";
    import CodeEntry from "./CodeView.svelte";

    export let entry: TypeEntry;
    export let interactive: boolean = true;

    const dispatch = createEventDispatcher<{ selected: { entry: TypeEntry }}>();

    function dispatchSelection() { 
        if(interactive)
            dispatch("selected", { entry });
    }

</script>

<div 
    class="type" 
    class:interactive
    tabIndex=0
    on:mousedown|stopPropagation={dispatchSelection}
    on:keydown={event => event.key === "Enter" || event.key === " " ? dispatchSelection() : undefined }
>
    <CodeEntry node={entry.name} interactive/>
</div>

<style>
    .type {
        display: inline-block;
    }

    .type:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
    }

</style>
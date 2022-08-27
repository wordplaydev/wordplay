<script lang="ts">

    import type Program from "../nodes/Program";
import renderNode from "./renderNode";

    export let program: Program;

</script>

<div class="node-view">
    {#each program.borrows as borrow}<svelte:component this={renderNode(borrow)} node={borrow} /> {/each}
    <svelte:component this={renderNode(program.block)} node={program.block} />
</div>

<style>
    :global(.node-view) {
        padding: var(--wordplay-editor-padding);
        border-top-left-radius: 3px;
        border-bottom-right-radius: 3px;
        border: 1px solid lightGrey;
        display: inline-block;
        margin-bottom: 2px;
    }

    :root {
        --wordplay-editor-padding: 2px;
    }

</style>
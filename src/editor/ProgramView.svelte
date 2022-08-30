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
        display: inline;
        border-top-left-radius: 3px;
        border-bottom-right-radius: 3px;
        font-family: "Noto Sans Mono", monospace;
        font-size: small;
    }

    :global(.node-view:hover) {
        border-color: lightGrey;
        cursor: pointer;
    }

    :root {
        --wordplay-editor-padding: 0;
        --wordplay-editor-indent: 3em;
    }

</style>
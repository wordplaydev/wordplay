<script lang="ts">
    
    import type Program from "../nodes/Program";
    import NodeView from "./NodeView.svelte";

    export let program: Program;

</script>

<div class="node-view">
    {#each program.borrows as borrow}<NodeView node={borrow}/>{/each}
    <NodeView node={program.block}/>
</div>

<style>

    div {
        font-size: medium;
    }

    :global(.node-view) {
        display: inline;
        border-top-left-radius: 3px;
        border-bottom-right-radius: 3px;
        font-family: "Noto Sans Mono", monospace;
    }

    :global(.node-view:hover) {
        border-color: lightGrey;
        cursor: pointer;
    }

    :root {
        --wordplay-editor-padding: .5em;
        --wordplay-editor-indent: 3em;

        --color-blue: #648FFF;
        --color-purple: #785EF0;
        --color-pink: #DC267F;
        --color-orange: #FE6100;
        --color-yellow: #FFB000;
        --color-grey: #AAAAAA;
        --color-white: #FFFFFF;
        --color-black: #000000;

    }

</style>
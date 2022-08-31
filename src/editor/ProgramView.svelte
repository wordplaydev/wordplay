<script lang="ts">
    
    import type Program from "../nodes/Program";
import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let program: Program;

</script>

<NodeView node={program}>
    {#each program.borrows as borrow}<OptionalNodeView node={borrow}/>{/each}
    <OptionalNodeView node={program.block}/>
</NodeView>

<style>

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
<script lang="ts">
    import type Block from "../nodes/Block";
import DocsView from "./DocsView.svelte";
    import renderNode from "./renderNode";

    export let node: Block;

</script>

<div class="node-view {node.statements.length === 1 ? "single" : "multiple"} { node.open ? "not-root" : ""}">
    <DocsView docs={node.docs}/>
    {#if node.open } <svelte:component this={renderNode(node.open)} node={node.open} /> {/if}
    <div class="statements">
        {#each node.statements as statement }
            <div class="{node.statements.length === 1 ? "expression" : "statement"}">
                <svelte:component this={renderNode(statement)} node={statement} />
            </div>
        {/each}
    </div>
    {#if node.close } <svelte:component this={renderNode(node.close)} node={node.close} /> {/if}
</div>

<style>

    .multiple .statement:not(:last-child) {
        margin-bottom: 1em;
    }

    .multiple.not-root > .statements {
        margin-left: var(--wordplay-editor-indent);
    }

    .single .statements {
        display: inline;
    }

    .expression {
        display:inline;
    }

    .node-view.multiple {
        display: flex;
        flex-direction: column;
    }

</style>
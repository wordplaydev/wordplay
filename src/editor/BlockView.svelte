<script lang="ts">
    import type Block from "../nodes/Block";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";

    export let node: Block;

</script>

<div class="node-view {node.statements.length === 1 ? "single" : "multiple"} { node.open ? "not-root" : ""}">
    <DocsView docs={node.docs}/><NodeView node={node.open}/><div class="statements">{#each node.statements as statement }<div class="{node.statements.length === 1 ? "expression" : "statement"}"><NodeView node={statement}/></div>{/each}</div><NodeView node={node.close}/>
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

</style>
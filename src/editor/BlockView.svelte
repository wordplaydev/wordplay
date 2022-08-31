<script lang="ts">
    import type Block from "../nodes/Block";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let node: Block;

</script>

<NodeView node={node}>
    <span class="{node.statements.length === 1 ? "single" : "multiple"} { node.open ? "not-root" : ""}">
        <DocsView docs={node.docs}/><OptionalNodeView node={node.open}/><div class="statements">{#each node.statements as statement }<div class="{node.statements.length === 1 ? "expression" : "statement"}"><OptionalNodeView node={statement}/></div>{/each}</div><OptionalNodeView node={node.close}/>
    </span>
</NodeView>

<style>

    .multiple .statement:not(:last-child) {
        margin-bottom: var(--wordplay-editor-spacing);
    }

    .multiple.not-root > .statements {
        margin-left: var(--wordplay-editor-indent);
    }

    .single .statements {
        display: inline;
    }

    .expression {
        display: inline;
    }

</style>
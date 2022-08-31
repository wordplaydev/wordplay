<script lang="ts">
    import type Block from "../nodes/Block";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let node: Block;

    const singleton = node.statements.length === 1;

</script>

<NodeView node={node} block={!singleton}>
    <span class="{singleton ? "single" : "multiple"} { node.open ? "not-root" : ""}">
        <DocsView docs={node.docs}/><OptionalNodeView node={node.open}/><div class="statements">{#each node.statements as statement }<div class="{singleton ? "expression" : "statement"}"><OptionalNodeView node={statement}/></div>{/each}</div><OptionalNodeView node={node.close}/>
    </span>
</NodeView>

<style>

    .multiple {
        display: block;
    }

    .multiple .statement:not(:last-child) {
        margin-bottom: var(--wordplay-editor-spacing);
    }

    .multiple.not-root > .statements {
        margin-left: var(--wordplay-editor-indent);
    }

    .single > .statements {
        display: inline;
    }

    .expression {
        display: inline;
    }

</style>
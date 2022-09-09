<script lang="ts">
    import type ConversionDefinition from "../nodes/ConversionDefinition";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: ConversionDefinition;

</script>

<NodeView node={node}>
    <DocsView docs={node.docs}/><TokenView node={node.convert}/><OptionalNodeView node={node.output}/><OptionalNodeView node={node.expression}/>
</NodeView>
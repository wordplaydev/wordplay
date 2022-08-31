<script lang="ts">
    import type ConversionDefinition from "../nodes/ConversionDefinition";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: ConversionDefinition;

</script>

 <div class="node-view">
    <DocsView docs={node.docs}/>
    <TokenView node={node.convert}/><NodeView node={node.output}/><NodeView node={node.expression}/>
</div>
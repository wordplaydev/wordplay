<script lang="ts">
    import type Template from "../nodes/Template";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";
    
    export let node: Template;

</script>

<NodeSequenceView nodes={node.parts}/><NodeView node={node.format}/>
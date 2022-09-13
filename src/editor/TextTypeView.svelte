<script lang="ts">
    import type TextType from "../nodes/TextType";
    import NodeView from "./NodeView.svelte";
    
    export let node: TextType;

</script>

<NodeView node={node.quote} /><NodeView node={node.format}/>
<script lang="ts">
    import type Block from "../nodes/Block";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";

    export let node: Block;

</script>

<NodeSequenceView nodes={node.docs}/><NodeView node={node.open}/><NodeSequenceView nodes={node.statements}/><NodeView node={node.close}/>
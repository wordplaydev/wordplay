<script lang="ts">
    import type NoneType from "../nodes/NoneType";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";

    export let node: NoneType;

</script>

<NodeView node={node.none}/><NodeSequenceView nodes={node.aliases}/>
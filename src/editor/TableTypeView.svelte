<script lang="ts">
    import type TableType from "../nodes/TableType";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";

    export let node: TableType;

</script>

<NodeSequenceView nodes={node.columns}/><NodeView node={node.close}/>

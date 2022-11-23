<svelte:options immutable={true}/>
<script lang="ts">
    import type UnparsableType from "../nodes/UnparsableType";
    import NodeSequenceView from "./NodeSequenceView.svelte";

    export let node: UnparsableType;

</script>

<NodeSequenceView nodes={node.unparsables}/>
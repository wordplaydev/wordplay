<script lang="ts">
    import type Names from "../nodes/Names";
    import NodeSequenceView from "./NodeSequenceView.svelte";

    export let node: Names;

</script>

<NodeSequenceView nodes={node.names}/>
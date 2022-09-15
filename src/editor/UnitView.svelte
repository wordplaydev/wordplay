<script lang="ts">
    import type Unit from "../nodes/Unit";
    import NodeSequenceView from "./NodeSequenceView.svelte";

    export let node: Unit;

</script>

<NodeSequenceView nodes={node.numeratorTokens}/><NodeSequenceView nodes={node.denominatorTokens}/>
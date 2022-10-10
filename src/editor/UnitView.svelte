<script lang="ts">
    import type Unit from "../nodes/Unit";
    import NodeSequenceView from "./NodeSequenceView.svelte";

    export let node: Unit;

</script>

<NodeSequenceView nodes={node.numerator}/><NodeSequenceView nodes={node.denominator}/>
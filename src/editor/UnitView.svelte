<script lang="ts">
    import type Unit from "../nodes/Unit";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Unit;

</script>

<NodeView node={node}>
    {#each node.tokens as token}<TokenView node={token}/>{/each}
</NodeView>
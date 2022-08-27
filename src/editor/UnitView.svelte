<script lang="ts">
    import type Unit from "../nodes/Unit";
    import TokenView from "./TokenView.svelte";

    export let node: Unit;

</script>

<div class="node-view">
    {#each node.tokens as token}<TokenView node={token}/>{/each}
</div>
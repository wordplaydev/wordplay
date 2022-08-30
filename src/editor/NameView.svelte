<script lang="ts">
    import type Name from "../nodes/Name";
    import TokenView from "./TokenView.svelte";
    
    export let node: Name;

</script>

<span class="node-view">
    <TokenView node={node.name} />
</span>
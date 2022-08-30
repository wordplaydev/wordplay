<script lang="ts">
    import type TypePlaceholder from "../nodes/TypePlaceholder";
    import TokenView from "./TokenView.svelte";
    
    export let node: TypePlaceholder;

</script>

<div class="node-view">
    <TokenView node={node.etc} />
</div>
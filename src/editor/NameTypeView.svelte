<script lang="ts">
    import type NameType from "../nodes/NameType";
    import TokenView from "./TokenView.svelte";
    
    export let node: NameType;

</script>

<div class="node-view">
    <TokenView node={node.type} />
</div>
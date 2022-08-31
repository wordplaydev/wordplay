<script lang="ts">
    import type BooleanType from "../nodes/BooleanType";
    import TokenView from "./TokenView.svelte";
    
    export let node: BooleanType;

</script>

<TokenView node={node.type} />
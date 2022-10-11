<script lang="ts">
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import type Caret from "../models/Caret";
    import type ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
    import NodeView from "./NodeView.svelte";
    
    export let node: ExpressionPlaceholder;

    let caret = getContext<Writable<Caret>>("caret");


</script>

<NodeView node={node.etc} />
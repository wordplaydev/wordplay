<script lang="ts">
    import type Language from "../nodes/Language";
    import NodeView from "./NodeView.svelte";
    
    export let node: Language;

</script>

<small><em><NodeView node={node.slash}/><NodeView node={node.lang}/></em></small>
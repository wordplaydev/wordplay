<script lang="ts">
    import type Docs from "../nodes/Docs";
    import NodeView from "./NodeView.svelte";
    
    export let doc: Docs;

</script>

<NodeView node={doc.docs}/><NodeView node={doc.lang}/>
<script lang="ts">
    import type Docs from "../nodes/Docs";
    import NodeSequenceView from "./NodeSequenceView.svelte";

    export let node: Docs;

</script>

<NodeSequenceView nodes={node.docs}/>
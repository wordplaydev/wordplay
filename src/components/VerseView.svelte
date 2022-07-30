<script lang="ts">
    import type Evaluator from "../runtime/Evaluator";
    import type Structure from "../runtime/Structure";
    import GroupView from "./GroupView.svelte";

    export let verse: Structure;
    export let evaluator: Evaluator | undefined;
    $: group = verse.resolve("group") as Structure;

    function handleMouseDown() {
        if(evaluator)
            evaluator.getShares().getMouseButton().record(true);
    }
    function handleMouseUp() {
        if(evaluator)
            evaluator.getShares().getMouseButton().record(false);
    }

</script>

<div style={`width: 100%; height: auto;`} on:mousedown={handleMouseDown} on:mouseup={handleMouseUp}>
    <GroupView group={group} />
</div>

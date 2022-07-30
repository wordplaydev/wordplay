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
    function handleMouseMove(event: MouseEvent) {
        if(evaluator)
            evaluator.getShares().getMousePosition().record(event.offsetX, event.offsetY);
    }

</script>

<div style={`width: 100%; height: auto;`} 
    on:mousedown={handleMouseDown} 
    on:mouseup={handleMouseUp}
    on:mousemove={handleMouseMove}
>
    <GroupView group={group} />
</div>

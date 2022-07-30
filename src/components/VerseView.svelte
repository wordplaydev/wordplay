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
    function handleKeyUp(event: KeyboardEvent) {
        if(evaluator)
            evaluator.getShares().getKeyboard().record(event.key, false);
    }
    function handleKeyDown(event: KeyboardEvent) {
        if(evaluator)
            evaluator.getShares().getKeyboard().record(event.key, true);
    }

</script>

<div style={`width: 100%; height: auto;`} tabindex=0
    on:mousedown={handleMouseDown} 
    on:mouseup={handleMouseUp}
    on:mousemove={handleMouseMove}
    on:keydown={handleKeyDown}
    on:keyup={handleKeyUp}
>
    <GroupView group={group} />
</div>

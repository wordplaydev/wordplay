<script lang="ts">
    import type Evaluator from "../runtime/Evaluator";
    import Structure from "../runtime/Structure";
    import ExceptionView from "./ExceptionView.svelte";
    import GroupView from "./GroupView.svelte";

    export let verse: Structure;
    export let evaluator: Evaluator | undefined;
    $: group = verse.resolve("group");

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

<div class="verse" style={`width: 100%; height: auto;`} tabindex=0
    on:mousedown={handleMouseDown} 
    on:mouseup={handleMouseUp}
    on:mousemove={handleMouseMove}
    on:keydown={handleKeyDown}
    on:keyup={handleKeyUp}
>
    {#if !(group instanceof Structure)}
        <ExceptionView>Group wasn't a structure</ExceptionView>
    {:else}
        <GroupView group={group} />
    {/if}

</div>

<style>
    .verse:focus {
        outline: hidden;
    }
</style>
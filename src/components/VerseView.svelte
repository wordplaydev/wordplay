<script lang="ts">
    import type Evaluator from "../runtime/Evaluator";
    import Structure from "../runtime/Structure";
    import ExceptionView from "./ExceptionView.svelte";
    import EvaluatorView from "./EvaluatorView.svelte";
    import GroupView from "./GroupView.svelte";
    import { onMount } from "svelte";

    export let verse: Structure | undefined;
    export let evaluator: Evaluator;
    $: group = verse?.resolve("group", evaluator);

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

    let visible = false;
    onMount(() => visible = true);

</script>

{#if visible}
    <div class="verse" style={`width: 100%; height: auto;`} tabindex=0
        on:mousedown={handleMouseDown} 
        on:mouseup={handleMouseUp}
        on:mousemove={handleMouseMove}
        on:keydown|stopPropagation|preventDefault={handleKeyDown}
        on:keyup={handleKeyUp}
    >
        {#if verse === undefined}
            <EvaluatorView evaluator={evaluator} />
        {:else if !(group instanceof Structure)}
            <ExceptionView>Group wasn't a structure</ExceptionView>
        {:else}
            <GroupView group={group} />
        {/if}

    </div>
{/if}

<style>
    .verse:focus {
        outline: hidden;
    }
</style>
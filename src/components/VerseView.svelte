<svelte:options immutable={true}/>

<script lang="ts">
    import type Evaluator from "../runtime/Evaluator";
    import Structure from "../runtime/Structure";
    import ExceptionView from "./ExceptionView.svelte";
    import EvaluatorView from "./EvaluatorView.svelte";
    import GroupView from "./GroupView.svelte";
    import { onMount } from "svelte";
    import { styleToCSS } from "../native/Style";
    import type Project from "../models/Project";

    export let project: Project;
    export let verse: Structure;
    export let evaluator: Evaluator;
    export let interactive: boolean;

    $: group = verse?.resolve("group", evaluator);

    function handleMouseDown() {
        project.streams?.mouseButton.record(true);
    }
    function handleMouseUp() {
        project.streams?.mouseButton.record(false);
    }
    function handleMouseMove(event: MouseEvent) {
        project.streams?.mousePosition.record(event.offsetX, event.offsetY);
    }
    function handleKeyUp(event: KeyboardEvent) {
        project.streams?.keyboard.record(event.key, false);
    }
    function handleKeyDown(event: KeyboardEvent) {
        project.streams?.keyboard.record(event.key, true);
    }

    let visible = false;
    onMount(() => visible = true);

</script>

{#if visible}
    <div class="verse {interactive ? "" : "inert"}" tabIndex={interactive ? 0 : null}
        on:mousedown={interactive ? handleMouseDown : null} 
        on:mouseup={interactive ? handleMouseUp : null}
        on:mousemove={interactive ? handleMouseMove : null}
        on:keydown|stopPropagation|preventDefault={interactive ? handleKeyDown : null}
        on:keyup={interactive ? handleKeyUp : null}
        style={styleToCSS(verse?.resolve("style", evaluator))}
    >
        {#if !(group instanceof Structure)}
            <ExceptionView>Group wasn't a structure</ExceptionView>
        {:else}
            <GroupView group={group} />
        {/if}

    </div>
{/if}

<style>
    .verse {
        width: 100%; 
        height: 100%;
        display: flex;
        align-items: stretch;
    }

    .inert {
        background-color: var(--wordplay-disabled-color);
    }

</style>
<script lang="ts">
    import type Evaluator from "../runtime/Evaluator";
    import Structure from "../runtime/Structure";
    import ExceptionView from "./ExceptionView.svelte";
    import EvaluatorView from "./EvaluatorView.svelte";
    import GroupView from "./GroupView.svelte";
    import { onMount } from "svelte";
    import { Fonts, type FontWeight } from "../native/Fonts";

    export let verse: Structure | undefined;
    export let evaluator: Evaluator;
    $: group = verse?.resolve("group", evaluator);
    $: style = verse?.resolve("style", evaluator);
    $: size = (style instanceof Structure ? style.getMeasurement("size") : undefined) ?? 12;
    $: font = (style instanceof Structure ? style.getText("font") : undefined) ?? "Noto Sans";
    $: weight = (style instanceof Structure ? style.getMeasurement("weight") : undefined) ?? 4;
    $: italic = style instanceof Structure ? style.getBool("italic") : undefined;

    // Ensure the font is loaded.
    $: if(font) Fonts.load({ name: font, weight: (weight ?? 4) * 100 as FontWeight, italic: false});

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
    <div class="verse" tabindex=0
        on:mousedown={handleMouseDown} 
        on:mouseup={handleMouseUp}
        on:mousemove={handleMouseMove}
        on:keydown|stopPropagation|preventDefault={handleKeyDown}
        on:keyup={handleKeyUp}
        style={`font-family: "${font}"; font-size: ${size}pt; font-weight: ${weight}; font-style: ${italic ? "italic" : "normal"};`}
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
    .verse {
        width: 100%; 
        height: 100%;
        display: flex;
        align-items: stretch;
    }

    .verse:focus {
        outline: hidden;
    }
</style>
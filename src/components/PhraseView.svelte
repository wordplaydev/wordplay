<svelte:options immutable={true}/>

<script lang="ts">
    import Structure from "../runtime/Structure";
    import { onMount } from "svelte";
    import type Phrase from "../output/Phrase";

    export let phrase: Phrase;
    export let inline: boolean = false;

    $: text = phrase.text ?? "";
    $: transition = phrase.transition;
    $: animation = phrase.animation;

    $: animationStyle = 
        (
            animation?.type === Wobble ? `--wobble-rotation: ${(animation instanceof Structure ? animation.getMeasurement("angle") : undefined) ?? 5}deg;` : 
            animation?.type === Throb ? `--throb-scale: ${(animation instanceof Structure ? animation.getMeasurement("scale") : undefined) ?? 1.2};` :
            animation?.type === Bounce ? `--bounce-height: ${(animation instanceof Structure ? animation.getMeasurement("height") : undefined) ?? 100}px;` :
            ""
        ) + `--duration: ${animation?.duration ?? 0}ms; --animation-count: ${animation?.count === Infinity ? "infinite" : animation?.count ?? 0};`


    $: cssStyle = `${style} ${animationStyle}`;
    $: classes = `phrase ${inline ? "inline" : ""} ${
        animation?.type === Wobble ? "wobble" :
        animation?.type === Throb ? "throb" :
        animation?.type === Bounce ? "bounce" :
        ""}`;

    $: renderedText = text.replaceAll(" ", "&nbsp;");

    $: transitionFunction =
        transition?.type === Fade ?
            (node: HTMLElement, {}) => {
                const style = getComputedStyle(node);
                const opacity = +style.opacity;

                return {
                    delay: transition?.delay ?? 0,
                    duration: transition?.duration ?? 400,
                    css: (t: number) => `opacity: ${t * opacity}`
                }
            } : 
        transition?.type === Scale ?
            (node: HTMLElement, {}) => {
                node;
                return {
                    delay: transition?.delay ?? 0,
                    duration: transition?.duration ?? 400,
                    css: (t: number) => `transform: scale(${2 - t})`
                }
            } : 
        undefined;

    let visible = false;
    onMount(() => visible = true);
    
</script>

<!-- Key on the phrase's creator node, so we only trigger transitions when this phrase view's creator changes. -->
{#if visible }
    {#key phrase.value.id }
        {#if transitionFunction }
            <div class={classes} style={cssStyle} in:transitionFunction={{}}>{@html renderedText}</div>
        {:else}
            <div class={classes} style={cssStyle}>{@html renderedText}</div>
        {/if}
    {/key}
{/if}
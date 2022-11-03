<script lang="ts">
    import Structure from "../runtime/Structure";
    import { Fade, Scale } from "../native/Transition";
    import { Bounce, Throb, Wobble } from "../native/Animation";
    import { onMount } from "svelte";
    import { Fonts, type FontWeight } from "../native/Fonts";

    export let phrase: Structure;

    $: text = phrase.getText("text") ?? "";
    $: style = phrase.resolve("style");
    $: size = style instanceof Structure ? style.getMeasurement("size") : undefined;
    $: font = style instanceof Structure ? style.getText("font") : undefined;
    $: weight = style instanceof Structure ? style.getMeasurement("weight") : undefined;
    $: transition = phrase.resolve("in");
    $: animation = phrase.resolve("animate");

    $: transitionType = transition instanceof Structure ? transition.type : undefined;
    $: transitionDuration = transition instanceof Structure ? transition.getMeasurement("duration") : undefined;
    $: transitionDelay = transition instanceof Structure ? transition.getMeasurement("delay") : undefined;

    $: animationType = animation instanceof Structure ? animation.type : undefined;
    $: animationDuration = (animation instanceof Structure ? animation.getMeasurement("duration") : undefined) ?? 400;
    $: animationCount = (animation instanceof Structure ? animation.getMeasurement("count") : undefined) ?? Infinity;
    $: animationStyle = 
        (
            animationType === Wobble ? `--wobble-rotation: ${(animation instanceof Structure ? animation.getMeasurement("angle") : undefined) ?? 5}deg;` : 
            animationType === Throb ? `--throb-scale: ${(animation instanceof Structure ? animation.getMeasurement("scale") : undefined) ?? 1.2};` :
            animationType === Bounce ? `--bounce-height: ${(animation instanceof Structure ? animation.getMeasurement("height") : undefined) ?? 100}px;` :
            ""
        ) + `--duration: ${animationDuration}ms; --animation-count: ${animationCount === Infinity ? "infinite" : animationCount};`


    $: cssStyle = `${size !== undefined ? `font-size: ${size}pt;` : ""} ${font !== undefined ? `font-family: "${font}";` : ""} ${weight !== undefined ? `font-weight: ${weight * 100};` : ""} ${animationStyle}`;
    $: classes = `phrase ${
        animationType === Wobble ? "wobble" :
        animationType === Throb ? "throb" :
        animationType === Bounce ? "bounce" :
        ""}`;

    // Ensure the font is loaded.
    $: if(font) Fonts.load({ name: font, weight: (weight ?? 4) * 100 as FontWeight, italic: false});

    $: renderedText = text.replaceAll(" ", "&nbsp;");

    $: transitionFunction =
        transitionType === Fade ?
            (node: HTMLElement, {}) => {
                const style = getComputedStyle(node);
                const opacity = +style.opacity;

                return {
                    delay: transitionDelay ?? 0,
                    duration: transitionDuration ?? 400,
                    css: (t: number) => `opacity: ${t * opacity}`
                }
            } : 
        transitionType === Scale ?
            (node: HTMLElement, {}) => {
                node;
                return {
                    delay: transitionDelay ?? 0,
                    duration: transitionDuration ?? 400,
                    css: (t: number) => `transform: scale(${2 - t})`
                }
            } : 
        undefined;

    let visible = false;
    onMount(() => visible = true);
    
</script>

<!-- Key on the phrase's creator node, so we only trigger transitions when this phrase view's creator changes. -->
{#if visible }
    {#key phrase.creator.id }
        {#if transitionFunction }
            <div class={classes} style={cssStyle} in:transitionFunction={{}}>{@html renderedText}</div>
        {:else}
            <div class={classes} style={cssStyle}>{@html renderedText}</div>
        {/if}
    {/key}
{/if}

<style>

    .phrase {
        animation-iteration-count: var(--animation-count); 
        animation-duration: var(--duration);
    }

    .wobble {
        animation-name: wobble;
    }

    .throb {
        animation-name: throb;
    }

    .bounce {
        animation-name: bounce;
        animation-timing-function: cubic-bezier(0.280, 0.840, 0.420, 1);
        transform-origin: bottom;
    }

</style>
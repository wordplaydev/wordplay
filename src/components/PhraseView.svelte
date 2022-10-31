<script lang="ts">
    import Structure from "../runtime/Structure";
    import Measurement from "../runtime/Measurement";
    import Text from "../runtime/Text";
    import ExceptionView from "./ExceptionView.svelte";
    import { Fade } from "../native/Transition";

    export let phrase: Structure;

    $: size = phrase.resolve("size");
    $: text = phrase.resolve("text");
    $: font = phrase.resolve("font");
    $: transition = phrase.resolve("in");

    $: transitionType = transition instanceof Structure ? transition.type : undefined;
    $: transitionDuration = transition instanceof Structure ? transition.resolve("duration") : undefined;
    $: transitionDelay = transition instanceof Structure ? transition.resolve("delay") : undefined;

    $: transitionFunction =
        transitionType === Fade ?
            (node: HTMLElement) => {
                const style = getComputedStyle(node);
                const opacity = +style.opacity;

                return {
                    delay: transitionDelay instanceof Measurement ? transitionDelay.toNumber() : 0,
                    duration: transitionDuration instanceof Measurement ? transitionDuration.toNumber() : 400,
                    css: (t: number) => `opacity: ${t * opacity}`
                }
            } : undefined;

</script>

{#if !(size instanceof Measurement)}
    <ExceptionView>expected size to be a #</ExceptionView>
{:else if !(text instanceof Text)}
    <ExceptionView>expected text to be a ""</ExceptionView>
{:else if !(font instanceof Text)}
    <ExceptionView>expected text to be a ""</ExceptionView>
{:else}
    {@const style = `font-size: ${size.num.toNumber()}pt; font-family: "${font.text}"` }
    <!-- Key on the phrase's creator node, so we only trigger transitions when this phrase view's creator changes. -->
    {#key phrase.creator.id }
        {#if transitionFunction }
            <div style={style} in:transitionFunction>
                {text.text}
            </div>
        {:else}
            <div style={style}>
                {text.text}
            </div>
        {/if}
    {/key}
{/if}
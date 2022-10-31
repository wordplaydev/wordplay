<script lang="ts">
    import type Structure from "../runtime/Structure";
    import Measurement from "../runtime/Measurement";
    import Text from "../runtime/Text";
    import ExceptionView from "./ExceptionView.svelte";
    import { fade } from "svelte/transition";

    export let phrase: Structure;

    $: size = phrase.resolve("size");
    $: text = phrase.resolve("text");
    $: font = phrase.resolve("font");

</script>

{#if !(size instanceof Measurement)}
    <ExceptionView>expected size to be a #</ExceptionView>
{:else if !(text instanceof Text)}
    <ExceptionView>expected text to be a ""</ExceptionView>
{:else if !(font instanceof Text)}
    <ExceptionView>expected text to be a ""</ExceptionView>
{:else}
    <!-- Key on the phrase's creator node, so we only trigger transitions when this phrase view's creator changes. -->
    {#key phrase.creator.id }
        <div style={`font-size: ${size.num.toNumber()}pt; font-family: "${font.text}"`} in:fade>
            {text.text}
        </div>
    {/key}
{/if}
<script lang="ts">
    import type Structure from "../runtime/Structure";
    import Measurement from "../runtime/Measurement";
    import Text from "../runtime/Text";
    import ExceptionView from "./ExceptionView.svelte";

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
<div style={`font-size: ${size.num.toNumber()}pt; font-family: "${font.text}"`}>
    {text.text}
</div>
{/if}
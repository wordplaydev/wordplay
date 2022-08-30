<script lang="ts">
    import type Structure from "../runtime/Structure";
    import type Measurement from "../runtime/Measurement";
    import type Text from "../runtime/Text";

    export let phrase: Structure;

    $: size = phrase.resolve("size") as Measurement;
    $: text = phrase.resolve("text") as Text;
    $: font = phrase.resolve("font") as Text;

</script>

<div style={`font-size: ${size.num.toNumber()}pt; font-family: "${font.text}"`}>
    {text.text}
</div>

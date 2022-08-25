<script lang="ts">
    import type Structure from "../runtime/Structure";
    import type Measurement from "../runtime/Measurement";
    import type Text from "../runtime/Text";

    export let letters: Structure;

    $: size = letters.resolve("size") as Measurement;
    $: text = letters.resolve("text") as Text;
    $: font = letters.resolve("font") as Text;

</script>

<div style={`font-size: ${size.num.toNumber()}pt; font-family: "${font.text}"`}>
    {text.text}
</div>

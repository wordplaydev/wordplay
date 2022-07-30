<script lang="ts">
    import type Structure from "../runtime/Structure";
    import type Measurement from "../runtime/Measurement";
    import type Text from "../runtime/Text";

    export let sentence: Structure;
    $: size = sentence.resolve("size") as Measurement;
    $: text = sentence.resolve("text") as Text;
    $: font = sentence.resolve("font") as Text;

</script>

<span style={`font-size: ${size.num.toNumber()}pt; font-family: "${font.text}"`}>
    {text.text}
</span>

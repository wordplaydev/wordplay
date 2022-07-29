<script lang="ts">
    import type Structure from "../runtime/Structure";
    import type Measurement from "../runtime/Measurement";
    import type Text from "../runtime/Text";

    export let words: Structure;
    $: size = words.resolve("size") as Measurement;
    $: text = words.resolve("text") as Text;
    $: font = words.resolve("font") as Text;

</script>

<p style={`text-align: center; font-size: ${size.num.toNumber()}pt; font-family: "${font.text}"`}>
    {text.text}
</p>

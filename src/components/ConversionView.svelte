<script lang="ts">
    import { CONVERT_SYMBOL } from "../parser/Tokenizer";
import type ConversionValue from "../runtime/ConversionValue";

    export let value: ConversionValue;

</script>

{CONVERT_SYMBOL}{value.definition.output.toWordplay()}
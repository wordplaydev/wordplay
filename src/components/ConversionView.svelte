<script lang="ts">
    import { CONVERT_SYMBOL } from "../parser/Tokenizer";
import type Conversion from "../runtime/Conversion";

    export let value: Conversion;

</script>

{CONVERT_SYMBOL}{value.definition.output.toWordplay()}
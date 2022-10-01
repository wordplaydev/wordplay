<script lang="ts">
    import { FALSE_SYMBOL, TRUE_SYMBOL } from "../parser/Tokenizer";
import type Bool from "../runtime/Bool";

    export let value: Bool;

</script>

{ value.bool ? TRUE_SYMBOL : FALSE_SYMBOL }
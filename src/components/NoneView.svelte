<script lang="ts">
    import { NONE_SYMBOL } from "../parser/Tokenizer";
    import type None from "../runtime/None";

    export let value: None;

</script>

{ NONE_SYMBOL}{value.aliases.join(" ") }
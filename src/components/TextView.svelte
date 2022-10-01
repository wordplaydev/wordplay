<script lang="ts">
    import { TEXT_SYMBOL } from "../parser/Tokenizer";
    import type Text from "../runtime/Text";

    export let value: Text;

</script>

{ TEXT_SYMBOL }{ value.format === undefined ? "" : value.format }
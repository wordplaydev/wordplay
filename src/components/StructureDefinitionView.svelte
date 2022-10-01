<script lang="ts">
    import { TYPE_SYMBOL } from "../parser/Tokenizer";
    import type StructureDefinitionValue from "../runtime/StructureDefinitionValue";

    export let value: StructureDefinitionValue;

</script>

{TYPE_SYMBOL}{value.definition.getNames().join(", ")}

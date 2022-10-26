<script lang="ts">
    import type FunctionValue from "../runtime/FunctionValue";

    export let value: FunctionValue;

</script>

{value.definition.names.getNames().join(" ")}
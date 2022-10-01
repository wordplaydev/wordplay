<script lang="ts">
    import type Structure from "../runtime/Structure";

    export let value: Structure;

</script>

{value.type.getNames().join(", ")}

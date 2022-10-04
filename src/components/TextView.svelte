<script lang="ts">
    import type Text from "../runtime/Text";

    export let value: Text;

</script>

'{value.text}'{ value.format === undefined ? "" : value.format }
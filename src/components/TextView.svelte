<script lang="ts">
    import TokenType from "../nodes/TokenType";
    import type Text from "../runtime/Text";
    import SymbolView from "./SymbolView.svelte";

    export let value: Text;

</script>

<SymbolView symbol={value.toWordplay()} type={TokenType.TEXT} />
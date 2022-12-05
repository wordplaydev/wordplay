<script lang="ts">
    import TokenType from "../nodes/TokenType";
    import type Measurement from "../runtime/Measurement";
    import SymbolView from "./SymbolView.svelte";

    export let value: Measurement;

</script>

<SymbolView symbol={ value.toWordplay() } type={TokenType.NUMBER} />
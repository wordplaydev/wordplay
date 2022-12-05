<script lang="ts">
    import TokenType from "../nodes/TokenType";
    import type None from "../runtime/None";
    import SymbolView from "./SymbolView.svelte";

    export let value: None;

</script>

<SymbolView symbol={value.toWordplay()} type={TokenType.NONE}/>
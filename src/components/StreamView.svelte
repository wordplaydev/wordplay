<svelte:options immutable={true}/>
<script lang="ts">
    import TokenType from "../nodes/TokenType";
    import type Stream from "../runtime/Stream";
    import SymbolView from "./SymbolView.svelte";

    export let value: Stream;

    import { languages } from "../models/languages";

</script>

<SymbolView symbol={value.names.getTranslation($languages)} type={TokenType.NAME} />
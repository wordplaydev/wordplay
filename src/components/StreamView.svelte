<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import TokenType from "../nodes/TokenType";
    import type Stream from "../runtime/Stream";
    import SymbolView from "./SymbolView.svelte";

    export let value: Stream;

    let languages = getLanguages();

</script>

<SymbolView symbol={value.names.getTranslation($languages)} type={TokenType.NAME} />
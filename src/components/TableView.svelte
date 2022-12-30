<svelte:options immutable={true} />

<script lang="ts">
    import type Table from '../runtime/Table';
    import { languages } from '../models/languages';
    import { TABLE_OPEN_SYMBOL } from '../parser/Tokenizer';
    import SymbolView from './SymbolView.svelte';
    import TokenType from '../nodes/TokenType';

    export let value: Table;
</script>

{#each value.literal.type.columns as col}
    <SymbolView
        symbol={col ? col.names.getTranslation($languages) : ''}
        type={TokenType.NAME}
    /><SymbolView symbol={TABLE_OPEN_SYMBOL} type={TokenType.TABLE_OPEN} />
{/each}

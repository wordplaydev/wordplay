<svelte:options immutable={true} />

<script lang="ts">
    import type Table from '@runtime/Table';
    import { TABLE_OPEN_SYMBOL } from '@parser/Symbols';
    import SymbolView from './SymbolView.svelte';
    import TokenType from '@nodes/TokenType';
    import { creator } from '../../db/Creator';

    export let value: Table;
</script>

{#each value.literal.type.columns as col}
    <SymbolView
        symbol={col ? col.names.getLocaleText($creator.getLanguages()) : ''}
        type={TokenType.Name}
    /><SymbolView symbol={TABLE_OPEN_SYMBOL} type={TokenType.TableOpen} />
{/each}

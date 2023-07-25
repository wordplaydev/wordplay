<svelte:options immutable={true} />

<script lang="ts">
    import type Table from '@runtime/Table';
    import { TABLE_OPEN_SYMBOL } from '@parser/Symbols';
    import SymbolView from './SymbolView.svelte';
    import Symbol from '@nodes/Symbol';
    import { config } from '../../db/Creator';

    export let value: Table;
</script>

{#each value.literal.type.columns as col}
    <SymbolView
        symbol={col ? col.names.getLocaleText($config.getLanguages()) : ''}
        type={Symbol.Name}
    /><SymbolView symbol={TABLE_OPEN_SYMBOL} type={Symbol.TableOpen} />
{/each}

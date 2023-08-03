<svelte:options immutable={true} />

<script lang="ts">
    import type Table from '@runtime/Table';
    import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
    import SymbolView from './SymbolView.svelte';
    import Symbol from '@nodes/Symbol';
    import { config } from '../../db/Creator';
    import ValueView from './ValueView.svelte';

    export let value: Table;
</script>

<SymbolView
    symbol={TABLE_OPEN_SYMBOL}
    type={Symbol.TableOpen}
/>{#each value.literal.type.columns as col}
    <SymbolView
        symbol={col
            ? col.names.getPreferredNameString($config.getLocales())
            : ''}
        type={Symbol.Name}
    />
{/each}<SymbolView symbol={TABLE_CLOSE_SYMBOL} type={Symbol.TableClose} />
<br />
{#each value.rows as row}
    <SymbolView
        symbol={TABLE_OPEN_SYMBOL}
        type={Symbol.TableOpen}
    />{#each value.literal.type.columns as col}
        {@const cell = row.resolve(col.names)}
        {#if cell}<ValueView value={cell} />{:else}-{/if}
    {/each}<SymbolView symbol={TABLE_CLOSE_SYMBOL} type={Symbol.TableClose} />
    <br />
{/each}

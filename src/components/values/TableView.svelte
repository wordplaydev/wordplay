<svelte:options immutable={true} />

<script lang="ts">
    import type TableValue from '@values/TableValue';
    import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
    import SymbolView from './SymbolView.svelte';
    import Symbol from '@nodes/Symbol';
    import { config } from '../../db/Creator';
    import ValueView from './ValueView.svelte';
    import Expandable from './Expandable.svelte';
    import RowView from './RowView.svelte';

    export let value: TableValue;
    export let inline: boolean = true;

    const limit = 3;
</script>

<!-- 
    Inline tables show the column type and an expandable inline list of rows
 -->
{#if inline}
    <SymbolView
        symbol={TABLE_OPEN_SYMBOL}
        type={Symbol.TableOpen}
    />{#each value.type.columns as col}{' '}<SymbolView
            symbol={col
                ? col.names.getPreferredNameString($config.getLocales())
                : ''}
            type={Symbol.Name}
        />{/each}{' '}<SymbolView
        symbol={TABLE_CLOSE_SYMBOL}
        type={Symbol.TableClose}
    />{#if value.rows.length > limit}
        <Expandable
            ><svelte:fragment slot="expanded"
                >{#each value.rows as item}<RowView
                        type={value.type}
                        row={item}
                    />{/each}</svelte:fragment
            ><svelte:fragment slot="collapsed"
                >{#each value.rows.slice(0, limit) as item}<RowView
                        type={value.type}
                        row={item}
                    />{/each}…</svelte:fragment
            ></Expandable
        >
    {:else}
        {#each value.rows as row}
            <SymbolView symbol={TABLE_OPEN_SYMBOL} type={Symbol.TableOpen} />
            {#each value.type.columns as col}
                {@const cell = row.resolve(col.names)}
                {#if cell}<ValueView value={cell} {inline} />{:else}-{/if}
            {/each}
            <SymbolView symbol={TABLE_CLOSE_SYMBOL} type={Symbol.TableClose} />
        {/each}
    {/if}

    <!-- A block table is an actual HTML table with value views in each. -->
{:else if value.type.columns.length === 0}
    <SymbolView symbol={TABLE_OPEN_SYMBOL} type={Symbol.TableOpen} />
    <SymbolView symbol={TABLE_CLOSE_SYMBOL} type={Symbol.TableOpen} />
{:else}
    <table>
        <tr>
            {#each value.type.columns as col}{' '}<td
                    ><SymbolView
                        symbol={col
                            ? col.names.getPreferredNameString(
                                  $config.getLocales()
                              )
                            : ''}
                        type={Symbol.Name}
                    /></td
                >{/each}
        </tr>
        {#each value.rows as row}
            <tr>
                {#each value.type.columns as col}
                    {@const cell = row.resolve(col.names)}
                    <td
                        >{#if cell}<ValueView
                                value={cell}
                                {inline}
                            />{:else}-{/if}</td
                    >
                {/each}
            </tr>
        {/each}
    </table>
{/if}

<script lang="ts">
    import { Sym } from '@nodes/Sym';
    import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
    import type TableValue from '@values/TableValue';
    import { locales } from '@db/Database';
    import Expandable from '@components/values/Expandable.svelte';
    import { fitCount } from '@components/values/fit';
    import RowView from '@components/values/RowView.svelte';
    import SymbolView from '@components/values/SymbolView.svelte';
    import ValueView from '@components/values/ValueView.svelte';

    export let value: TableValue;
    export let inline = true;

    $: start = fitCount(
        (i) => value.rows[i].toWordplay().length,
        value.rows.length,
    );
</script>

<!--
    Inline tables show the column type and an expandable inline list of rows
 -->
{#if inline}
    <SymbolView
        symbol={TABLE_OPEN_SYMBOL}
        type={Sym.TableOpen}
    />{#each value.type.columns as col}{' '}<SymbolView
            symbol={col ? $locales.getName(col.names) : ''}
            type={Sym.Name}
        />{/each}{' '}<SymbolView
        symbol={TABLE_CLOSE_SYMBOL}
        type={Sym.TableClose}
    /><Expandable count={value.rows.length} {start}
        >{#snippet content(limit)}{#each value.rows.slice(0, limit) as item}<RowView
                    type={value.type}
                    row={item}
                />{/each}{/snippet}</Expandable
    >

    <!-- A block table is an actual HTML table with value views in each. -->
{:else if value.type.columns.length === 0}
    <SymbolView symbol={TABLE_OPEN_SYMBOL} type={Sym.TableOpen} />
    <SymbolView symbol={TABLE_CLOSE_SYMBOL} type={Sym.TableOpen} />
{:else}
    <table>
        <tbody>
            <tr>
                {#each value.type.columns as col}<td
                        ><SymbolView
                            symbol={col ? $locales.getName(col.names) : ''}
                            type={Sym.Name}
                        /></td
                    >{/each}
            </tr>
            <Expandable
                count={value.rows.length}
                {start}
                layout="row"
                columns={value.type.columns.length}
                >{#snippet content(limit)}{#each value.rows.slice(0, limit) as row}<tr>
                            {#each value.type.columns as col}
                                {@const cell = row.resolve(col.names)}
                                <td
                                    >{#if cell}<ValueView
                                            value={cell}
                                            {inline}
                                        />{:else}-{/if}</td
                                >
                            {/each}
                        </tr>{/each}{/snippet}</Expandable
            >
        </tbody>
    </table>
{/if}

<script lang="ts">
    import Sym from '@nodes/Sym';
    import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
    import type TableValue from '@values/TableValue';
    import { locales } from '../../db/Database';
    import Expandable from './Expandable.svelte';
    import RowView from './RowView.svelte';
    import SymbolView from './SymbolView.svelte';
    import ValueView from './ValueView.svelte';

    export let value: TableValue;
    export let inline = true;

    const limit = 3;
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
    />{#if value.rows.length > limit}
        <Expandable>
            {#snippet expanded()}
                {#each value.rows as item}<RowView
                        type={value.type}
                        row={item}
                    />{/each}
            {/snippet}
            {#snippet collapsed()}
                {#each value.rows.slice(0, limit) as item}<RowView
                        type={value.type}
                        row={item}
                    />{/each}…
            {/snippet}
        </Expandable>
    {:else}
        {#each value.rows as row}
            <SymbolView symbol={TABLE_OPEN_SYMBOL} type={Sym.TableOpen} />
            {#each value.type.columns as col}
                {@const cell = row.resolve(col.names)}
                {#if cell}<ValueView value={cell} {inline} />{:else}-{/if}
            {/each}
            <SymbolView symbol={TABLE_CLOSE_SYMBOL} type={Sym.TableClose} />
        {/each}
    {/if}

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
        </tbody>
    </table>
{/if}

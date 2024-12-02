<script lang="ts">
    import type StructureValue from '@values/StructureValue';
    import SymbolView from './SymbolView.svelte';
    import {
        TABLE_CLOSE_SYMBOL,
        TABLE_OPEN_SYMBOL,
    } from '../../parser/Symbols';
    import Sym from '../../nodes/Sym';
    import type TableType from '../../nodes/TableType';
    import ValueView from './ValueView.svelte';

    interface Props {
        type: TableType;
        row: StructureValue;
    }

    let { type, row }: Props = $props();
</script>

<SymbolView symbol={TABLE_OPEN_SYMBOL} type={Sym.TableOpen} />
{#each type.columns as col}
    {@const cell = row.resolve(col.names)}
    {' '}{#if cell}<ValueView value={cell} />{:else}-{/if}
{/each}
<SymbolView symbol={TABLE_CLOSE_SYMBOL} type={Sym.TableClose} />

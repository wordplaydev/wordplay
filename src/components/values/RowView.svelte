<script lang="ts">
    import type StructureValue from '@values/StructureValue';
    import SymbolView from './SymbolView.svelte';
    import {
        TABLE_CLOSE_SYMBOL,
        TABLE_OPEN_SYMBOL,
    } from '../../parser/Symbols';
    import Symbol from '../../nodes/Symbol';
    import type TableType from '../../nodes/TableType';
    import ValueView from './ValueView.svelte';

    export let type: TableType;
    export let row: StructureValue;
</script>

<SymbolView symbol={TABLE_OPEN_SYMBOL} type={Symbol.TableOpen} />
{#each type.columns as col}
    {@const cell = row.resolve(col.names)}
    {' '}{#if cell}<ValueView value={cell} />{:else}-{/if}
{/each}
<SymbolView symbol={TABLE_CLOSE_SYMBOL} type={Symbol.TableClose} />

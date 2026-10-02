<script lang="ts">
    import type StructureValue from '#values/StructureValue.ts';
    import { Sym } from '#nodes/Sym.ts';
    import type TableType from '#nodes/TableType.ts';
    import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '#parser/Symbols.ts';
    import SymbolView from '#components/values/SymbolView.svelte';
    import ValueView from '#components/values/ValueView.svelte';

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

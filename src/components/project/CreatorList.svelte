<!-- A modifiable list of creators.

     A thin arrangement of PeopleTable, which every surface that lists people
     shares: the same row per person, the same remove button, and the same add
     field as the table's own next row. The metadata form — a class roster, with
     an editable cell per column — is the same table with more attribute cells,
     and it turns pairing off, since its rows are already wide. -->
<script lang="ts">
    import PeopleTable from '@components/project/PeopleTable.svelte';
    import Button from '@components/widgets/Button.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { CANCEL_SYMBOL } from '@parser/Symbols';

    interface Props {
        uids: string[];
        add?: undefined | ((uid: string, emailOrUsername: string) => void);
        remove?: undefined | ((uid: string, emailOrUsername: string) => void);
        removable?: undefined | ((uid: string) => boolean);
        editable: boolean;
        /** The add field's DOM id, which must be unique on the page. Named
         *  wherever more than one of these is rendered at once. */
        id?: string;
        anonymize: boolean;
        /** A uid by metadata list, if provided, each person gets a cell per entry. */
        metadata?: Map<string, string[]> | undefined;
        /** An optional function for adding a column before the given column number */
        addcolumn?: undefined | ((column: number) => void);
        /** An optional function for removing a column */
        removecolumn?: undefined | ((column: number) => void);
        /** A function for editing metadata */
        cell?:
            undefined | ((uid: string, column: number, value: string) => void);
    }

    let {
        uids,
        add,
        remove,
        removable,
        editable,
        id = 'creator-to-add',
        anonymize,
        metadata,
        cell,
        addcolumn,
        removecolumn,
    }: Props = $props();

    const columns = $derived(
        metadata === undefined
            ? 0
            : (Array.from(metadata.values())[0]?.length ?? 0),
    );
</script>

{#snippet metadataCells(uid: string)}
    {#each metadata?.get(uid) ?? [] as datum, column (column)}
        <td>
            {#if cell}
                <TextField
                    id="metadata-{uid}-{column}"
                    text={datum}
                    placeholder={(l) => l.ui.widget.table.cell.placeholder}
                    description={(l) => l.ui.widget.table.cell.description}
                    dwelled={(text) => cell(uid, column, text)}
                />
            {:else}
                {datum}
            {/if}
        </td>
    {/each}
{/snippet}

<!-- The add row lines up under the metadata columns rather than skipping them. -->
{#snippet blankMetadataCells()}
    {#each { length: columns } as _, column (column)}<td></td>{/each}
{/snippet}

<!-- Each column's own add and remove buttons, above the column they act on.
     A row of them off to one side would leave you counting across to find
     which is which. -->
{#snippet columnHeader()}
    <th></th>
    {#each { length: columns } as _, index (index)}
        <th
            >{#if addcolumn}<Button
                    tip={(l) => l.ui.widget.table.addcolumn}
                    action={() => addcolumn(index)}
                    icon="+"
                ></Button>{/if}{#if removecolumn}<Button
                    tip={(l) => l.ui.widget.table.removecolumn}
                    action={() => removecolumn(index)}
                    icon={CANCEL_SYMBOL}
                ></Button>{/if}</th
        >
    {/each}
    <th
        >{#if addcolumn}<Button
                tip={(l) => l.ui.widget.table.addcolumn}
                action={() => addcolumn(columns)}
                icon="+"
            ></Button>{/if}</th
    >
{/snippet}

<PeopleTable
    {uids}
    {editable}
    {anonymize}
    {add}
    {remove}
    {removable}
    addFieldID={id}
    attributes={columns}
    cells={metadata ? metadataCells : undefined}
    addCells={metadata ? blankMetadataCells : undefined}
    pair={metadata === undefined}
    header={addcolumn || removecolumn ? columnHeader : undefined}
/>

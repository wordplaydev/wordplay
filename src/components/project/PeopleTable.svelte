<!-- A table of people, one row each, with whatever each of them may do.

     Factored out of the collaborate tile so every surface that lists people —
     a gallery's curators and creators, a how-to's collaborators, a character's,
     a class's teachers and students — reads the same way: a person, their
     attributes, and a way to take them off, with the field that adds someone as
     the next row rather than a separate control beneath it.

     Two people share a row when there is width for it, which is what keeps six
     of them from costing six lines. -->
<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import AddCreator from '@components/project/AddCreator.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { Creators } from '@db/Database';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import type { Snippet } from 'svelte';

    interface Props {
        /** Who to list, in the order they should appear. */
        uids: string[];
        editable: boolean;
        anonymize: boolean;
        add?: undefined | ((uid: string, emailOrUsername: string) => void);
        remove?: undefined | ((uid: string, emailOrUsername: string) => void);
        removable?: undefined | ((uid: string) => boolean);
        /** The add field's DOM id, unique among every one on the page. */
        addFieldID?: string;
        /** A `data-uiid` for the add row, for a caller whose tour points at it. */
        addUiid?: string | undefined;
        /** How many cells each person has between their name and the remove
         *  button. The add row and the blank filler cells count on this. */
        attributes?: number;
        /** One person's attribute cells. Renders its own `<td>`s. */
        cells?: Snippet<[uid: string]> | undefined;
        /** The add row's attribute cells, in the same columns. */
        addCells?: Snippet | undefined;
        /** The same content laid out inline, for when there is nobody yet and
         *  so no table to be a row of. */
        addInline?: Snippet | undefined;
        /** A header row's cells, for a table whose columns need controls of
         *  their own. Only sensible unpaired, since a pair would repeat them. */
        header?: Snippet | undefined;
        /** A full-width row after a person, for something that needs to say
         *  more than a cell can — a confirmation, say. Handed the span it
         *  should cover, since only the table knows how wide it is. */
        extraRow?: Snippet<[uid: string, span: number]> | undefined;
        /** Whether people may share a row. Off where each person's cells are
         *  wide enough that a second would not fit — a metadata roster. */
        pair?: boolean;
        /** Roughly how wide one person's cells are, which is what decides how
         *  many fit. Depends on how many attributes they carry, so the caller
         *  says. */
        personWidth?: number;
    }

    let {
        uids,
        editable,
        anonymize,
        add = undefined,
        remove = undefined,
        removable = undefined,
        addFieldID = 'creator-to-add',
        addUiid = undefined,
        attributes = 0,
        cells,
        addCells,
        addInline,
        header,
        extraRow,
        pair = true,
        personWidth = 200,
    }: Props = $props();

    let creators: Record<string, Creator | null> = $state({});
    $effect(() => {
        Creators.getCreatorsByUIDs(uids).then((map) => (creators = map));
    });

    function nameOf(uid: string) {
        return creators[uid]?.getUsername(false) ?? uid;
    }

    let width = $state(0);

    /** People per row: as many as fit, from the first one. Empty space to the
     *  right of a list costs nothing but buys nothing either, and every column
     *  it can hold is a row of height it gives back. Never more columns than
     *  there are people, so a short list doesn't stretch into blank ones. */
    const perRow = $derived(
        pair
            ? Math.max(
                  1,
                  Math.min(uids.length, Math.floor(width / personWidth)),
              )
            : 1,
    );

    /** Cells one person occupies: their name, their attributes, and — only
     *  where someone can be taken off — the button that does it. */
    const columns = $derived(1 + attributes + (editable && remove ? 1 : 0));

    const groups = $derived(
        uids.reduce<string[][]>(
            (all, uid, index) => (
                index % perRow === 0
                    ? all.push([uid])
                    : all[all.length - 1].push(uid),
                all
            ),
            [],
        ),
    );
</script>

{#snippet personCells(uid: string)}
    <td
        ><CreatorView
            {anonymize}
            chrome={false}
            creator={creators[uid] ?? null}
        /></td
    >
    {@render cells?.(uid)}
    {#if editable && remove}
        <td class="actions"
            >{#if removable === undefined || removable(uid)}<Button
                    tip={(l) => l.ui.project.button.removeCollaborator}
                    action={() => remove(uid, nameOf(uid))}
                    icon={CANCEL_SYMBOL}
                ></Button>{/if}</td
        >
    {/if}
{/snippet}

{#snippet blankCells()}
    {#each { length: columns } as _, column (column)}<td></td>{/each}
{/snippet}

{#snippet body()}
    <table class:paired={perRow > 1}>
        {#if header}
            <thead>
                <tr>{@render header()}</tr>
            </thead>
        {/if}
        <tbody>
            {#each groups as group (group[0])}
                <tr>
                    {#each group as uid (uid)}{@render personCells(
                            uid,
                        )}{/each}<!-- A ragged last row would leave the table
                        narrower than the rows above it. -->
                    {#each { length: perRow - group.length } as _, slot (slot)}{@render blankCells()}{/each}
                </tr>
                {#each group as uid (uid)}
                    {@render extraRow?.(uid, perRow * columns)}
                {/each}
            {/each}
            <!-- Adding someone is the next row of the same list, not a control
                 beneath it, so its field and button sit in the same columns
                 everyone else's do. -->
            {#if editable && add}
                <tr data-uiid={addUiid}>
                    <AddCreator
                        cells
                        id={addFieldID}
                        {add}
                        extraCells={addCells}
                    />
                    {#each { length: perRow - 1 } as _, slot (slot)}
                        {@render blankCells()}
                    {/each}
                </tr>
            {/if}
        </tbody>
    </table>
{/snippet}

<div class="people-table" bind:clientWidth={width}>
    <!-- Nobody yet, so there is no table for the field to be the next row of:
         a border around one field reads as an empty list rather than an
         invitation. -->
    {#if uids.length === 0}
        {#if editable && add}
            <div data-uiid={addUiid}>
                <AddCreator id={addFieldID} {add} extra={addInline} />
            </div>
        {/if}
    {:else if editable && add}
        <!-- The form wraps the table because it cannot wrap a row. Nothing
             navigates: the submit button prevents the default, and Enter in the
             field reaches it through implicit submission. -->
        <form onsubmit={(event) => event.preventDefault()}>
            {@render body()}
        </form>
    {:else}
        {@render body()}
    {/if}
</div>

<style>
    .people-table {
        width: 100%;
    }

    /* Shrink to fit rather than filling: stretching put a column of attributes
       against the far edge, a long way from the names they belong to. Except
       when two people share a row, where filling is what makes them share the
       width evenly and compress instead of overflowing. */
    table {
        width: auto;
    }

    table.paired {
        width: 100%;
    }

    /* The global rule pads every cell by a full spacing unit, which is a lot of
       height per person where a list sits in a tile. */
    table :global(td),
    table :global(th) {
        padding: var(--wordplay-spacing-half);
    }

    /* CreatorView centers itself, which reads as a ragged column once several
       people are listed. */
    table :global(td .creator) {
        justify-content: flex-start;
    }

    .actions {
        white-space: nowrap;
    }
</style>

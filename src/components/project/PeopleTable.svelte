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
    import { tick, type Snippet } from 'svelte';

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
        /** Keep the add row behind a "+" until it is asked for, rather than
         *  showing an empty field under every list. Off by default, since a
         *  list whose whole purpose is to be added to should say so. */
        addDisclosure?: boolean;
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
        addDisclosure = false,
    }: Props = $props();

    /** Whether the add row is showing. Always, unless the caller asked for the
     *  disclosure — in which case pressing "+" is what opens it, and it stays
     *  open, since somebody adding one person often adds another. */
    let adding = $state(false);
    let addingNow = $derived(!addDisclosure || adding);
    let addRow = $state<HTMLElement | undefined>(undefined);
    let addButton = $state<HTMLButtonElement | undefined>(undefined);

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
            loading={!(uid in creators)}
            reserve
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
            {#if editable && add && addingNow}
                <tr
                    data-uiid={addDisclosure ? undefined : addUiid}
                    bind:this={addRow}
                >
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
            <div class="with-add" class:dismissing={addDisclosure && adding}>
                {@render body()}
                {#if addDisclosure}
                    <!-- Beside the table, not a row of it: a row would spend
                         the very height this is here to save. One control,
                         which opens the row and then puts it away again, so
                         changing your mind costs the press it took. It carries
                         the caller's `data-uiid`, so a tour pointing at "add
                         someone" has a target whichever way it is showing. -->
                    <div class="add" data-uiid={addUiid}>
                        <Button
                            bind:view={addButton}
                            tip={adding
                                ? (l) => l.ui.collaborate.table.cancel
                                : (l) => l.ui.collaborate.table.add}
                            expanded={adding}
                            controls={addFieldID}
                            action={() => {
                                adding = !adding;
                                tick().then(() =>
                                    adding
                                        ? addRow
                                              ?.querySelector('input')
                                              ?.focus()
                                        : addButton?.focus(),
                                );
                            }}
                            icon={adding ? CANCEL_SYMBOL : '+'}
                        ></Button>
                    </div>
                {/if}
            </div>
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

    /* No border and no stripes. The app's global table chrome is meant for a
       table of data in prose; a list of people is a list of controls, and each
       row already carries its own — a name, a menu, a remove button — which is
       enough to read the structure by. Overridden here rather than globally,
       since a documentation table still wants its rules. */
    table {
        border: none;
    }

    table :global(tr:nth-child(odd)) {
        background: none;
    }

    /* The table and the control that adds to it, side by side. */
    .with-add {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 2);
    }

    /* Once the field is showing, the control puts *that row* away, not the
       table — so it drops to the row it belongs to. Centred against the whole
       table it read as a delete button for the lot. The end padding is the
       same half-spacing every cell has, which is what lands it on the row's
       content rather than on the table's bottom edge. */
    .with-add.dismissing {
        align-items: flex-end;
    }

    /* The cell's own padding, and then the same again: the row is as tall as
       the field in it, and a bare button is shorter, so sitting on the row's
       floor would leave it low. This puts it on the row's centre line. */
    .with-add.dismissing .add {
        padding-block-end: var(--wordplay-spacing);
    }

    .with-add table {
        flex: 0 1 auto;
        min-width: 0;
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

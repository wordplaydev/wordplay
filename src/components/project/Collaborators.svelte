<!-- Everyone who can reach a project, and what each of them may do.

     One table rather than a labelled list per role. The tile is a chat that
     also manages permissions, and the four stacked lists — each with its own
     add field — took more of it than the conversation did, in a header that
     never yielded height and so clipped rather than scrolled. A table also
     makes the model visible: a person has exactly one privilege, which is what
     `Project.withPrivilegeFor` enforces. -->
<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import PeopleTable from '@components/project/PeopleTable.svelte';
    import Notice from '@components/app/Notice.svelte';
    import {
        privilegeAnnouncement,
        removalAnnouncement,
    } from '@components/project/collaboratorAnnounce';
    import { getAnnouncer } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import Options from '@components/widgets/Options.svelte';
    import { Chats, Creators, locales } from '@db/Database';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import type Gallery from '@db/galleries/Gallery';
    import type Project from '@db/projects/Project';
    import {
        ProjectPrivileges,
        type ProjectPrivilege,
    } from '@db/projects/Project';
    import { Projects } from '@db/projects/Projects';
    import {
        CANCEL_SYMBOL,
        EDIT_SYMBOL,
        OWNER_SYMBOL,
        STAGE_SYMBOL,
        VIEW_SYMBOL,
    } from '@parser/Symbols';

    interface Props {
        project: Project;
        /** The gallery the project is in, if any, whose curators can reach it too. */
        gallery: Gallery | undefined;
        /** True only for the owner — everyone else reads this table. */
        editable: boolean;
        /** True while a message is being written, when the conversation needs
         *  the tile more than the permissions do. */
        collapsed: boolean;
    }

    let { project, gallery, editable, collapsed }: Props = $props();

    /** What a row says a person may do. The two that aren't a
     *  {@link ProjectPrivilege} are the two nobody can choose here: owning is a
     *  transfer, and curating belongs to the gallery. */
    type RowPrivilege = ProjectPrivilege | 'owner' | 'curate';

    /** A glyph for each privilege, so a row reads at a glance and the picker's
     *  options are distinguishable before they are read.
     *
     *  Kept here rather than in the locale: it is the same mark in every
     *  language, and a translator given it as text would eventually translate
     *  or drop it. It has to ride in the option's *label* rather than a rich
     *  snippet, because WebKit renders only the flattened label — see
     *  `supportsBaseSelect` in Options.svelte. */
    const PrivilegeGlyphs: Record<RowPrivilege, string> = {
        owner: OWNER_SYMBOL,
        collaborate: EDIT_SYMBOL,
        // Not PHRASE_SYMBOL, which is the same glyph meaning a Phrase: this is
        // a speech bubble because commenting is talking, not because of output.
        comment: '💬',
        view: VIEW_SYMBOL,
        curate: STAGE_SYMBOL,
    };

    function privilegeLabel(privilege: RowPrivilege): string {
        return `${PrivilegeGlyphs[privilege]} ${$locales.getPrimaryPlainText(
            (l) => l.ui.collaborate.role[privilege],
        )}`;
    }

    type Row = {
        uid: string;
        privilege: RowPrivilege;
        /** Whether the owner may change or revoke this privilege. */
        changeable: boolean;
    };

    /** One row per person, most powerful first, each appearing once. Someone in
     *  two of the project's lists — possible in anything saved before
     *  `withPrivilegeFor` — resolves to the more powerful of them. */
    const rows: Row[] = $derived.by(() => {
        const seen = new Set<string>();
        const list: Row[] = [];
        const add = (
            uid: string,
            privilege: RowPrivilege,
            changeable: boolean,
        ) => {
            if (seen.has(uid)) return;
            seen.add(uid);
            list.push({ uid, privilege, changeable });
        };
        const owner = project.getOwner();
        // Not your own row when you own it: you brought that fact with you, and
        // it costs a line of a small tile. A non-owner keeps theirs, since it is
        // the only place they learn what they may do here.
        if (owner !== null && !editable) add(owner, 'owner', false);
        for (const uid of project.getCollaborators())
            add(uid, 'collaborate', true);
        for (const uid of project.getCommenters()) add(uid, 'comment', true);
        for (const uid of project.getViewers()) add(uid, 'view', true);
        for (const uid of gallery?.getCurators() ?? [])
            add(uid, 'curate', false);
        return list;
    });

    /** Everyone who can see the chat, which is not the same set as the rows:
     *  viewers can see the project but not the conversation about it. Derived
     *  from the project rather than the chat so it is right before anyone has
     *  said anything. */
    const audience = $derived([
        ...Chats.getEligibleParticipants(project, gallery),
    ]);

    const byUid = $derived(new Map(rows.map((row) => [row.uid, row])));

    function rowFor(uid: string) {
        return byUid.get(uid);
    }

    let creators: Record<string, Creator | null> = $state({});
    $effect(() => {
        Creators.getCreatorsByUIDs([
            ...new Set([...rows.map((row) => row.uid), ...audience]),
        ]).then((map) => (creators = map));
    });

    const announce = getAnnouncer();

    function say(message: string) {
        if (announce && $announce)
            $announce('collaborator', $locales.getLanguages()[0], message);
    }

    function nameOf(uid: string) {
        return creators[uid]?.getUsername(false) ?? uid;
    }

    /** Which person the owner has proposed handing the project to, if any. A
     *  transfer can't be undone by the person doing it, so it confirms. */
    let transferring = $state<string | undefined>(undefined);

    function isPrivilege(value: string | undefined): value is ProjectPrivilege {
        return ProjectPrivileges.some((privilege) => privilege === value);
    }

    function choose(uid: string, value: string | undefined) {
        if (value === 'owner') transferring = uid;
        else if (isPrivilege(value)) {
            transferring = undefined;
            Projects.reviseProject(project.withPrivilegeFor(uid, value));
            say(privilegeAnnouncement($locales, nameOf(uid), value));
        }
    }

    function remove(uid: string) {
        const name = nameOf(uid);
        transferring = undefined;
        Projects.reviseProject(project.withPrivilegeFor(uid, undefined));
        say(removalAnnouncement($locales, name));
    }

    function transfer(uid: string) {
        const name = nameOf(uid);
        transferring = undefined;
        Projects.reviseProject(project.withOwnerTransferredTo(uid));
        say(
            $locales
                .concretize((l) => l.ui.collaborate.announce.transferred, {
                    name,
                    project: project.getName(),
                })
                .toText(),
        );
    }

    /** Owner first, since choosing it is the one option that confirms rather
     *  than applying, and a picker that opened onto it would read as a trap. */
    const options = $derived(
        [...ProjectPrivileges, 'owner' as const].map((privilege) => ({
            value: privilege,
            label: privilegeLabel(privilege),
        })),
    );

    /** What a newly added person may do. Collaborating is what sharing a
     *  project has always meant here — it is what the field's own description
     *  promises — so it is the default rather than the safest option. */
    let adding = $state<ProjectPrivilege>('collaborate');
</script>

{#snippet privilegePicker()}
    <Options
        id="collaborator-privilege"
        value={adding}
        label={(l) => l.ui.collaborate.table.adding}
        width="10em"
        options={ProjectPrivileges.map((privilege) => ({
            value: privilege,
            label: privilegeLabel(privilege),
        }))}
        change={(value) => {
            if (isPrivilege(value)) adding = value;
        }}
    />
{/snippet}

{#snippet addPrivilegeCell()}
    <td>{@render privilegePicker()}</td>
{/snippet}

{#snippet privilegeCell(uid: string)}
    {@const row = rowFor(uid)}
    <td class="privilege">
        {#if row === undefined}{:else if editable && row.changeable}
            <!-- Keyed on whether this row is mid-transfer, because a select the
                 reader has driven doesn't take a new value back from its
                 parent: without a remount, cancelling a transfer would leave
                 the picker reading "owner" for a privilege nobody has. Choosing
                 a privilege doesn't flip the key, so an ordinary change keeps
                 focus. -->
            {#key transferring === uid}
                <Options
                    id="privilege-{uid}"
                    value={row.privilege}
                    label={$locales
                        .concretize((l) => l.ui.collaborate.table.choose, {
                            name: nameOf(uid),
                        })
                        .toText()}
                    tip={null}
                    {options}
                    width="10em"
                    change={(value) => choose(uid, value)}
                />
            {/key}
        {:else}
            {privilegeLabel(row.privilege)}
        {/if}
    </td>
{/snippet}

{#snippet confirmRow(uid: string, span: number)}
    {#if transferring === uid}
        <tr>
            <td colspan={span}>
                <div class="confirm">
                    <Button
                        background="salient"
                        tip={(l) =>
                            l.ui.collaborate.button.transfer.description}
                        action={() => transfer(uid)}
                        label={(l) => l.ui.collaborate.button.transfer.prompt}
                    />
                    <Button
                        tip={(l) => l.ui.widget.confirm.cancel}
                        action={() => (transferring = undefined)}
                        icon={CANCEL_SYMBOL}
                    />
                    <!-- Beside the button rather than on it: what you give up
                         is worth reading, and a sentence on a button stretches
                         the row it sits in. -->
                    <Note
                        ><LocalizedText
                            path={(l) =>
                                l.ui.collaborate.button.transfer.consequence}
                        /></Note
                    >
                </div>
                <!-- Gallery membership doesn't follow a project to
     its new owner, and silently adding them to
     someone else's gallery isn't ours to do. -->
                {#if gallery}
                    <Notice
                        text={(l) => l.ui.collaborate.error.transferGallery}
                    />
                {/if}
            </td>
        </tr>
    {/if}
{/snippet}

<!-- Focusable when it isn't editable, since a scrollable region with no
     focusable content inside it can't be reached by keyboard at all. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
    class="people"
    data-uiid="collaborators"
    role="group"
    aria-label={$locales.getPrimaryPlainText(
        (l) => l.ui.collaborate.table.label,
    )}
    tabindex={editable || collapsed ? undefined : 0}
>
    <!-- While someone is writing, the permissions give the tile to the
         conversation and say only who will read it.

         The swap is instant. It used to slide, and however the two halves were
         timed the movement read as jank rather than as continuity — a table
         growing and shrinking under the thing you are typing into is a
         distraction from the typing. -->
    {#if collapsed}
        <div
            class="audience"
            aria-label={$locales.getPrimaryPlainText(
                (l) => l.ui.collaborate.table.audience,
            )}
        >
            {#each audience as uid (uid)}
                <CreatorView
                    anonymize={false}
                    chrome={false}
                    creator={creators[uid] ?? null}
                    loading={!(uid in creators)}
                    reserve
                />
            {/each}
        </div>
    {:else}
        <div class="managing" class:oneline={rows.length === 0}>
            <!-- The prompt and the table answer the same question, so exactly
                 one of them shows: the prompt asks for someone, and the moment
                 there is one it has been answered and repeating it is noise. -->
            {#if rows.length === 0 && editable}
                <Note
                    ><LocalizedText
                        path={(l) => l.ui.collaborate.prompt}
                    /></Note
                >
            {/if}
            <div class="table">
                <PeopleTable
                    uids={rows.map((row) => row.uid)}
                    {editable}
                    anonymize={false}
                    attributes={1}
                    personWidth={300}
                    addDisclosure
                    addFieldID="collaborator-to-add"
                    addUiid="addCollaborator"
                    cells={privilegeCell}
                    extraRow={confirmRow}
                    addCells={addPrivilegeCell}
                    add={(uid, emailOrUsername) => {
                        Projects.reviseProject(
                            project.withPrivilegeFor(uid, adding),
                        );
                        // Named with what was typed: their creator record
                        // hasn't been resolved yet, so nameOf would say a raw
                        // uid out loud.
                        say(
                            privilegeAnnouncement(
                                $locales,
                                emailOrUsername,
                                adding,
                            ),
                        );
                    }}
                    remove={(uid) => remove(uid)}
                    removable={(uid) => rowFor(uid)?.changeable ?? false}
                    addInline={privilegePicker}
                />
            </div>
        </div>
    {/if}
</div>

<style>
    /* Takes the width left over, so the table can measure whether two people
       fit: shrink-to-fit here reported the table's own width and never paired. */
    .table {
        flex: 1 1 auto;
        min-width: 0;
    }

    /* Ours, not the shared table's: a privilege is one word and a picker. */
    .privilege {
        white-space: nowrap;
    }

    .audience,
    .managing {
        display: flex;
        gap: var(--wordplay-spacing);
        width: 100%;
    }

    /* A row, so the add field uses the empty space beside a short table rather
       than costing a line under it. It wraps, so a narrow tile stacks them the
       way it always did. */
    .managing {
        flex-direction: row;
        flex-wrap: wrap;
        /* Beside a table, the top: its rows have their own baselines and
           aligning to the first one would read as an accident. */
        align-items: start;
    }

    /* On one line — the prompt and the field, before anyone is added — the
       words on either side sit on a common baseline instead of each finding
       its own top. */
    .managing.oneline {
        align-items: baseline;
    }

    /* Wrapping rather than scrolling: a scrolling row would need a tab stop of
       its own, which would land between the message field and the send button
       exactly while someone is typing. */
    .audience {
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        align-items: center;
    }

    .people {
        display: flex;
        flex-direction: column;
        /* Otherwise the table stretches to the tile and strands the privileges
           against the far edge, away from the names they belong to. */
        align-items: start;
        gap: var(--wordplay-spacing);
        /* Yields height to the chat and scrolls, rather than being clipped by
           the tile the way the old fixed-height header was. */
        flex: 0 1 auto;
        min-height: 0;
        max-block-size: 40cqb;
        overflow-y: auto;
        font-size: var(--wordplay-small-font-size);
    }

    .confirm {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>

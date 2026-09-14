<script lang="ts">
    import PageHeader from '@components/app/PageHeader.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import PeopleTable from '@components/project/PeopleTable.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { getUser } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import { getClaimHolders, setClaims } from '@db/admin/claims';
    import { isAdmin } from '@db/projects/Moderation';
    import { noClaims } from '@db/creators/getClaim';
    import type { ClaimHolder, ClaimName, ClaimSet } from 'shared-types';
    import AdminsOnly from './AdminsOnly.svelte';

    const user = getUser();

    /** The three a superuser may give and take away here. `banned` is not one
     *  of them: it is a moderation decision, so it can only be lifted, and only
     *  from the button below. */
    const Privileges: ClaimName[] = ['admin', 'mod', 'teacher'];

    /** Everyone who holds something, or undefined while we're still asking, or
     *  null if we couldn't. */
    let holders: ClaimHolder[] | undefined | null = $state(undefined);
    /** Whose row is mid-write, so their checkboxes can't be double-pressed. */
    let saving: string | undefined = $state(undefined);
    /** Whether the last change failed, said once above the table rather than
     *  per row: a failure here is the callable refusing or the network, both of
     *  which apply to the whole page. */
    let failed = $state(false);
    /** What a newly added creator is being given, before they're added. */
    let pending: ClaimSet = $state(noClaims());
    /** Whether the add row was submitted with nothing ticked, which would add a
     *  row that vanishes on the next load. */
    let nothingChosen = $state(false);

    const listed: ClaimHolder[] = $derived(holders ?? []);
    const uids = $derived(listed.map((holder) => holder.uid));

    /**
     * Whether anyone here has lost public sharing.
     *
     * The column only exists when the answer is yes. Three of these columns are
     * privileges, and an empty checkbox in them reads as "no"; this one is a
     * sanction, and it has no checkbox to be empty — so when nobody is under
     * one it is a heading over four blank cells, which reads as something
     * missing rather than as nothing to report. Almost nobody is ever banned,
     * so almost always this table is simply about privileges.
     */
    const anyBanned = $derived(listed.some((holder) => holder.claims.banned));

    async function load() {
        holders = undefined;
        try {
            holders = (await getClaimHolders()).holders;
        } catch (error) {
            console.error(error);
            holders = null;
        }
    }

    /**
     * Ask for the roster only once the claim has answered.
     *
     * `getClaimHolders` refuses anyone without it, and the claim is answered
     * against a token this page load may still be refreshing — so loading on
     * mount would send the old token, be refused, and show "we couldn't load
     * this" on the very visit that admitted them. Asking through `isAdmin`
     * rather than through the gate costs nothing: the refresh behind it is
     * memoized for the whole page load.
     */
    $effect(() => {
        const who = $user;
        if (who === null || who === undefined) return;
        isAdmin(who).then((yes) => {
            if (yes) void load();
        });
    });

    /** Someone's claims as we last heard them. */
    function claimsOf(uid: string): ClaimSet {
        return (
            listed.find((holder) => holder.uid === uid)?.claims ?? noClaims()
        );
    }

    /**
     * Write one change and keep the row in step with what the server actually
     * stored, rather than with what was pressed: `setClaims` answers with the
     * whole set, and that answer is the truth.
     */
    async function change(uid: string, claims: Partial<ClaimSet>) {
        saving = uid;
        failed = false;
        try {
            const result = await setClaims({ uid, claims });
            holders = listed.map((holder) =>
                holder.uid === uid
                    ? { ...holder, claims: result.claims }
                    : holder,
            );
            // Changing your own privileges changes what this very session may
            // do, and the token it holds says otherwise until it is replaced.
            if (uid === $user?.uid) await $user?.getIdTokenResult(true);
        } catch (error) {
            console.error(error);
            failed = true;
        } finally {
            saving = undefined;
        }
    }

    /** Take away everything someone holds, leaving any ban alone: a button that
     *  silently un-banned a creator would be the worst thing on this page. */
    async function revoke(uid: string) {
        await change(uid, { admin: false, mod: false, teacher: false });
        // Nobody holds anything now, so they are no longer on this list —
        // unless they are still banned, which is not something this took away.
        if (!claimsOf(uid).banned)
            holders = listed.filter((holder) => holder.uid !== uid);
    }

    async function add(uid: string) {
        if (!Privileges.some((claim) => pending[claim])) {
            nothingChosen = true;
            return;
        }
        nothingChosen = false;
        // Added to the list first so the write has a row to land in; the
        // response replaces these claims with whatever was actually stored.
        if (!uids.includes(uid))
            holders = [
                { uid, username: null, email: null, claims: noClaims() },
                ...listed,
            ];
        await change(uid, { ...pending });
        pending = noClaims();
    }
</script>

<svelte:head>
    <Title text={(l) => l.ui.page.admin.header} />
</svelte:head>

<Writing wide>
    <!-- The header alone, never the description: it explains a table, and
         somebody who may not see the table should not be told how to read it.
         AdminsOnly renders its own header in each of its refusals, so the two
         never both appear. -->
    <PageHeader header={(l) => l.ui.page.admin.header} />
    <AdminsOnly>
        <MarkupHTMLView markup={(l) => l.ui.page.admin.prompt} />
        {#if holders === undefined}
            <Spinning />
        {:else if holders === null}
            <MarkupHTMLView markup={(l) => l.ui.page.admin.error.offline} />
        {:else}
            {#if failed}
                <Notice>
                    <MarkupHTMLView
                        markup={(l) => l.ui.page.admin.error.save}
                    />
                </Notice>
            {/if}
            {#if nothingChosen}
                <Notice>
                    <MarkupHTMLView
                        markup={(l) => l.ui.page.admin.error.none}
                    />
                </Notice>
            {/if}
            {#if holders.length === 0}
                <MarkupHTMLView markup={(l) => l.ui.page.admin.nobody} />
            {/if}
            <div class="roster">
                <PeopleTable
                    {uids}
                    editable
                    anonymize={false}
                    pair={false}
                    rowHeader
                    allowSelf
                    attributes={anyBanned ? 5 : 4}
                    addFieldID="privilege-holder-to-add"
                    removeTip={(l) => l.ui.page.admin.button.revoke}
                    removable={(uid) =>
                        Privileges.some((claim) => claimsOf(uid)[claim])}
                    {add}
                    remove={revoke}
                    {header}
                    {cells}
                    {addCells}
                    {extraRow}
                />
            </div>
        {/if}
    </AdminsOnly>
</Writing>

{#snippet header()}
    <th scope="col"><LocalizedText path={(l) => l.ui.page.admin.creator} /></th>
    <th scope="col"><LocalizedText path={(l) => l.ui.page.admin.email} /></th>
    {#each Privileges as claim (claim)}
        <th scope="col" class="claim"
            ><LocalizedText path={(l) => l.ui.page.admin.claim[claim]} /></th
        >
    {/each}
    {#if anyBanned}
        <th scope="col" class="claim"
            ><LocalizedText path={(l) => l.ui.page.admin.claim.banned} /></th
        >
    {/if}
    <th scope="col"></th>
{/snippet}

{#snippet cells(uid: string)}
    {@const claims = claimsOf(uid)}
    {@const holder = listed.find((each) => each.uid === uid)}
    <td class="email">{holder?.email ?? '—'}</td>
    {#each Privileges as claim (claim)}
        <td class="claim"
            ><Checkbox
                id={`claim-${uid}-${claim}`}
                label={claim === 'admin' && uid === $user?.uid
                    ? (l) => l.ui.page.admin.ownAdmin
                    : (l) => l.ui.page.admin.claim[claim]}
                on={claims[claim]}
                editable={saving !== uid &&
                    !(claim === 'admin' && uid === $user?.uid)}
                changed={(value) => change(uid, { [claim]: value === true })}
            /></td
        >
    {/each}
    {#if anyBanned}
        <td class="claim"
            >{#if claims.banned}<span
                    title={$locales.getPlainText(
                        (l) => l.ui.page.admin.claim.banned,
                    )}>⛔</span
                >{/if}</td
        >
    {/if}
{/snippet}

{#snippet addCells()}
    <td></td>
    {#each Privileges as claim (claim)}
        <td class="claim"
            ><Checkbox
                id={`claim-new-${claim}`}
                label={(l) => l.ui.page.admin.claim[claim]}
                on={pending[claim]}
                changed={(value) =>
                    (pending = { ...pending, [claim]: value === true })}
            /></td
        >
    {/each}
    {#if anyBanned}<td class="claim"></td>{/if}
{/snippet}

{#snippet extraRow(uid: string, span: number)}
    {#if claimsOf(uid).banned}
        <tr>
            <td colspan={span}>
                <div class="lift">
                    <ConfirmButton
                        enabled={saving !== uid}
                        tip={(l) => l.ui.page.admin.button.lift.tip}
                        label={(l) => l.ui.page.admin.button.lift.label}
                        prompt={(l) => l.ui.page.admin.button.lift.label}
                        action={() => change(uid, { banned: false })}
                    />
                    <MarkupHTMLView
                        inline
                        markup={(l) => l.ui.page.admin.confirm}
                    />
                </div>
            </td>
        </tr>
    {/if}
{/snippet}

<style>
    /* CreatorView centres itself, which is right for a chip sitting in a row of
       chips and wrong for a column of names under a heading. */
    .roster :global(.creator) {
        justify-content: flex-start;
        /* Its own padding would set the names in from the heading above them. */
        padding-inline-start: 0;
    }

    /* A person and their address are text, so they read from the start edge;
       a column of checkboxes reads as a column only if each one sits under the
       middle of its heading. */
    .claim {
        text-align: center;
    }

    /* The headings are one, two and four words long, so they wrap to different
       heights — aligning them to the bottom is what puts every label next to
       the boxes it names rather than floating above a gap. */
    th {
        vertical-align: bottom;
    }

    .email {
        font-size: var(--wordplay-small-font-size);
        /* An address is someone's data, not a label, and worth copying. */
        user-select: text;
        -webkit-user-select: text;
    }

    .lift {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
        font-size: var(--wordplay-small-font-size);
    }

    th {
        font-size: var(--wordplay-small-font-size);
        text-align: start;
    }

    /* Out-specifies the rule above, which starts every heading at the start
       edge. */
    th.claim {
        text-align: center;
    }
</style>

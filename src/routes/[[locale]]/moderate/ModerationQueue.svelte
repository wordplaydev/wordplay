<!-- One thing at a time, decided and removed from the queue (#938, #8).

     A gallery asking to be listed and a kit asking to be listed are the same decision:
     look at one, record findings as flags, approve or deny or pass. So they are one
     component with a `content` snippet for the subject itself, rather than two files that
     were 38% the same text — including the whole stylesheet. `ReportQueue` stays its own,
     because a report is answered rather than listed. -->
<script lang="ts" generics="Subject">
    import Header from '@components/app/Header.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import { DB, disconnected, locales } from '@db/Database';
    import { firestore } from '@db/firebase';
    import moderate from '@db/moderation/moderate';
    import {
        allFlags,
        getFlagDescription,
        unknownFlags,
        withFlag,
        type ModerationState,
    } from '@db/projects/Moderation';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
    } from '@locale/Locales';
    import {
        collection,
        getDocs,
        limit,
        orderBy,
        query,
        where,
        type DocumentData,
    } from 'firebase/firestore';
    import type { Snippet } from 'svelte';
    import { onMount } from 'svelte';

    interface Props {
        /** What the moderate callable is told this decision is about. */
        kind: 'gallery' | 'kit' | 'howto';
        /** The Firestore collection holding the pending subjects. */
        collectionName: string;
        /** How to order a look. Galleries go by id, kits by recency. */
        order: { field: string; descending?: boolean };
        /** A stored document as a subject, or undefined when it won't parse. */
        parse: (data: DocumentData) => Subject | undefined;
        idOf: (subject: Subject) => string;
        text: {
            header: LocaleTextAccessor;
            done: LocaleTextsAccessor;
            explain: LocaleTextsAccessor;
            approve: { tip: LocaleTextAccessor; label: LocaleTextAccessor };
            deny: { tip: LocaleTextAccessor; label: LocaleTextAccessor };
            skip: { tip: LocaleTextAccessor; label: LocaleTextAccessor };
        };
        /** The subject itself, in whatever form a moderator needs to judge it. */
        content: Snippet<[Subject]>;
    }

    let { kind, collectionName, order, parse, idOf, text, content }: Props =
        $props();

    /** How many to look at at once, so a moderator can pass on several in a row without
     *  re-querying. */
    const PendingPerLook = 20;

    /** The queue. Held in memory so skipping is instant and needs no cursor: a decision
     *  removes the subject from `pending` server-side, so a later look never brings back
     *  what was decided. */
    let queue = $state<Subject[] | undefined>(undefined);
    /** Passed over in this session. Not written anywhere: passing is not deciding. */
    let skipped: Set<string> = $state(new Set());
    let saving = $state(false);
    let failed = $state(false);
    /** The look itself failed — unreachable, or a query no index covers. */
    let failedToLook = $state(false);
    /** Documents the query returned that this queue could not read. */
    let unreadable = $state(0);

    const subject = $derived(queue?.find((one) => !skipped.has(idOf(one))));

    let flags: ModerationState = $state(unknownFlags());
    // A fresh decision starts from no findings: whatever a previous one left would
    // otherwise pre-check boxes this moderator hasn't looked at.
    $effect(() => {
        if (subject !== undefined) idOf(subject);
        flags = unknownFlags();
    });

    onMount(() => void look());

    async function look() {
        if (firestore === undefined) {
            queue ??= [];
            return;
        }
        try {
            const pending = await DB.read(
                getDocs(
                    query(
                        collection(firestore, collectionName),
                        where('moderation', '==', 'pending'),
                        orderBy(order.field, order.descending ? 'desc' : 'asc'),
                        limit(PendingPerLook),
                    ),
                ),
            );
            const parsed = pending.docs.map((snap) => parse(snap.data()));
            queue = parsed.filter((one): one is Subject => one !== undefined);
            // A row that won't parse is not a row that isn't there. Dropping it quietly
            // makes a real backlog read as an empty queue, which is how a pending kit
            // stayed invisible while its author was told it was waiting for review.
            unreadable = parsed.length - queue.length;
        } catch (error) {
            // Two very different failures used to land here as the same empty list: a
            // backend that can't be reached, and a query the indexes don't cover — the
            // second of which only ever happens in production, where an empty queue would
            // be read as "nothing to do" rather than as a broken page.
            failedToLook = true;
            console.error(error);
            queue ??= [];
        }
    }

    async function decide(listing: 'approved' | 'denied') {
        const deciding = subject;
        if (deciding === undefined) return;
        const id = idOf(deciding);
        saving = true;
        failed = false;
        try {
            await moderate({
                kind,
                subject: id,
                listing,
                // Refusing a listing is not a strike: nothing was broken unless a flag
                // says so, and the flags travel with this decision either way.
                strike: false,
                decision: `${kind}-${id}-${listing}`,
                // Nulls mean "not looked at"; a decision has looked at all of them, so an
                // unchecked box is a finding of no.
                flags: Object.fromEntries(
                    Object.entries(flags).map(([flag, state]) => [
                        flag,
                        state === true,
                    ]),
                ),
            });
            queue = queue?.filter((one) => idOf(one) !== id);
        } catch (error) {
            console.error(error);
            failed = true;
        } finally {
            saving = false;
        }
    }
</script>

<div class="queue">
    <div class="decision">
        <Header text={text.header} />
        {#if queue === undefined}
            <Spinning />
        {:else if failedToLook}
            <Notice text={(l) => l.moderation.error.unreachable} />
        {:else if subject === undefined}
            <MarkupHTMLView markup={text.done} />
            {#if unreadable > 0}
                <Notice text={(l) => l.moderation.error.unreadable} />
            {/if}
        {:else}
            <MarkupHTMLView markup={text.explain} />
            <div class="flags">
                {#each allFlags() as flag (flag)}
                    <div class="flag">
                        <Checkbox
                            label={(l) => l.moderation.flags[flag]}
                            on={flags[flag] === null ? undefined : flags[flag]}
                            id={`${kind}-${flag}`}
                            changed={(value) =>
                                (flags = withFlag(flags, flag, value === true))}
                        />
                        <label for={`${kind}-${flag}`}>
                            <MarkupHTMLView
                                markup={getFlagDescription(flag, $locales) ??
                                    ''}
                            />
                        </label>
                    </div>
                {/each}
            </div>
            {#if failed}
                <Notice text={(l) => l.moderation.error.notmod} />
            {/if}
            <div class="controls">
                <Button
                    background
                    active={!$disconnected && !saving}
                    tip={text.approve.tip}
                    label={text.approve.label}
                    action={() => decide('approved')}
                    testid="{kind}-approve"
                />
                <Button
                    background
                    active={!$disconnected && !saving}
                    tip={text.deny.tip}
                    label={text.deny.label}
                    action={() => decide('denied')}
                    testid="{kind}-deny"
                />
                <Button
                    background
                    active={!$disconnected && !saving}
                    tip={text.skip.tip}
                    label={text.skip.label}
                    action={() => {
                        skipped = new Set([
                            ...skipped,
                            subject === undefined ? '' : idOf(subject),
                        ]);
                    }}
                />
            </div>
        {/if}
    </div>
    <div class="content">
        {#if subject === undefined}
            <div class="big">✔</div>
        {:else}
            {@render content(subject)}
        {/if}
    </div>
</div>

<style>
    .queue {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        width: 100%;
        height: 100%;
    }

    .decision {
        width: 25vw;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        border-inline-end: var(--wordplay-focus-width) solid
            var(--wordplay-border-color);
        overflow-x: hidden;
        overflow-y: auto;
    }

    .content {
        flex: 1;
        padding: var(--wordplay-spacing);
        overflow-y: auto;
    }

    .flags {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .flag {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        /* `start`, not `normal` (= stretch): a stretched checkbox floats in the middle
           of a rule that wraps. `Checkbox` sets its own `align-self` too, since it is
           the one place that knows the box's size. */
        align-items: start;
        font-size: medium;
    }

    .controls {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    .big {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        width: 100%;
        font-size: 120pt;
    }
</style>

<!-- The queue of reported messages, for whoever is responsible for them (#938).

     A real Firestore query, unlike the gallery dashboard this replaces: that
     one read an in-memory map exported from the notification bell, so it was
     empty unless the bell had mounted and run its effect, held nothing after a
     reload, and had no curator check on the route at all.

     A report holds the reported message's own text, which is what lets this
     work for a curator *and* a platform moderator: the message was moved out of
     the chat when it was reported, so reviewing it needs no read access to the
     conversation around it. -->
<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import CreatorView from '@components/app/CreatorView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { Creators, locales } from '@db/Database';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { firestore } from '@db/firebase';
    import moderate from '@db/moderation/moderate';
    import {
        getFlagDescription,
        isFlagged,
        moderatedFlags,
        withFlag,
        type ModerationState,
    } from '@db/projects/Moderation';
    import { localeGoto } from '@util/localeGoto';
    import {
        collection,
        getDocs,
        limit,
        orderBy,
        query,
        where,
    } from 'firebase/firestore';
    import type { SerializedReport } from 'shared-types';

    interface Props {
        /** Whoever is reviewing. */
        uid: string;
        /** Whether they hold the platform moderator claim, which decides which
         *  query can see anything: a mod reads what the platform is
         *  responsible for, everyone else reads what names them. */
        moderator: boolean;
    }

    let { uid, moderator }: Props = $props();

    /** How many to look at at once. Reports are rare, so this is one small
     *  read either way. */
    const PerLook = 20;

    let reports: SerializedReport[] = $state([]);
    let loading = $state(true);
    let failed = $state(false);
    /** Decided in this session, so the list doesn't wait on a re-query. */
    let done: Set<string> = $state(new Set());

    let flags: ModerationState = $state(moderatedFlags());
    let note = $state('');
    let saving = $state(false);
    let authors: Record<string, Creator | null> = $state({});

    const showing = $derived(
        reports.filter((report) => !done.has(reportKey(report))),
    );
    const current = $derived(showing[0]);
    const violates = $derived(isFlagged(flags));

    /** A report's own document id, rebuilt from what it is about. */
    function reportKey(report: SerializedReport): string {
        return report.kind === 'chat' && report.message !== undefined
            ? `chat:${report.subject}:${report.message}`
            : `${report.kind}:${report.subject}`;
    }

    async function load() {
        if (firestore === undefined) return;
        loading = true;
        failed = false;
        try {
            const found = await getDocs(
                query(
                    collection(firestore, 'reports'),
                    // A curator's queue is an array-contains on the report's
                    // own `moderators`, never a join against the gallery: rules
                    // allow only ~10 document accesses per query, and a curator
                    // with more galleries than that budget would have the whole
                    // query denied. See src/db/firestoreLimits.ts.
                    ...(moderator
                        ? [where('platform', '==', true)]
                        : [where('moderators', 'array-contains', uid)]),
                    where('resolved', '==', false),
                    orderBy('time'),
                    limit(PerLook),
                ),
            );
            reports = found.docs
                .map((doc) => doc.data())
                .filter((data): data is SerializedReport => data.v === 2)
                // Whole projects and galleries have their own queues; this one
                // is for what someone said.
                .filter(
                    (data) => data.kind === 'chat' || data.kind === 'howto',
                );
        } catch {
            failed = true;
        }
        loading = false;
    }

    $effect(() => {
        void uid;
        void moderator;
        load();
    });

    // Name whoever wrote it, so a curator knows who they're deciding about.
    // Not who reported it: a report is a request for review, not an accusation.
    $effect(() => {
        const author = current?.author;
        if (author == null) return;
        Creators.getCreatorsByUIDs([author]).then((found) => {
            authors = { ...authors, [author]: found[author] ?? null };
        });
    });

    async function decide(remove: boolean) {
        const report = current;
        if (report === undefined) return;
        saving = true;
        try {
            await moderate({
                kind: report.kind,
                subject: report.subject,
                ...(report.message === undefined
                    ? {}
                    : { message: report.message }),
                flags: remove ? flags : moderatedFlags(),
                ...(note.length > 0 ? { note } : {}),
                // A curator's decision is never a platform warning; only a
                // moderator working the platform's own queue can issue one.
                strike: false,
                decision: `${reportKey(report)}-${remove ? 'removed' : 'kept'}`,
            });
            done = new Set([...done, reportKey(report)]);
            flags = moderatedFlags();
            note = '';
        } catch {
            failed = true;
        }
        saving = false;
    }
</script>

<div class="queue">
    <Header text={(l) => l.ui.gallerymoderation.header} />
    <MarkupHTMLView markup={(l) => l.ui.gallerymoderation.description} />

    {#if loading}
        <Spinning />
    {:else if failed}
        <Notice text={(l) => l.ui.gallerymoderation.error} />
    {:else if current === undefined}
        <Notice
            ><MarkupHTMLView
                markup={(l) => l.ui.gallerymoderation.empty}
            /></Notice
        >
    {:else}
        <div class="report">
            <Labeled label={(l) => l.ui.gallerymoderation.labels.message}>
                <CreatorView
                    anonymize={false}
                    creator={current.author
                        ? (authors[current.author] ?? null)
                        : null}
                    loading={current.author
                        ? !(current.author in authors)
                        : false}
                />
                <!-- The reported words, read from the report rather than the
                     chat: they were moved there so that hiding them was real. -->
                <em>{current.text ?? ''}</em>
            </Labeled>

            <Labeled label={(l) => l.ui.gallerymoderation.labels.reason}>
                {#each Object.entries(flags) as [flag, state] (flag)}
                    <div class="flag">
                        <Checkbox
                            label={(l) => l.moderation.button.property}
                            on={state === true}
                            id={flag}
                            changed={(value) =>
                                (flags = withFlag(flags, flag, value === true))}
                        />
                        <label for={flag}>
                            <MarkupHTMLView
                                markup={getFlagDescription(flag, $locales) ??
                                    ''}
                            />
                        </label>
                    </div>
                {/each}
                <TextField
                    id="report-note"
                    text={note}
                    description={(l) => l.ui.gallerymoderation.note.description}
                    placeholder={(l) => l.ui.gallerymoderation.note.placeholder}
                    changed={(value) => (note = value)}
                />
            </Labeled>

            <Labeled label={(l) => l.ui.gallerymoderation.labels.action}>
                <Button
                    background
                    tip={(l) => l.ui.gallerymoderation.view.tip}
                    label={(l) => l.ui.gallerymoderation.view.label}
                    action={() =>
                        localeGoto(
                            current.gallery === null
                                ? `/project/${current.subject}`
                                : `/gallery/${current.gallery}/howto?id=${current.subject}`,
                        )}
                />
                <Button
                    background
                    active={violates && !saving}
                    tip={(l) => l.ui.gallerymoderation.remove.tip}
                    label={(l) => l.ui.gallerymoderation.remove.label}
                    action={() => decide(true)}
                />
                <Button
                    background
                    active={!saving}
                    tip={(l) => l.ui.gallerymoderation.keep.tip}
                    label={(l) => l.ui.gallerymoderation.keep.label}
                    action={() => decide(false)}
                />
            </Labeled>
            {#if showing.length > 1}
                <p class="remaining">
                    <LocalizedText
                        path={(l) => l.ui.gallerymoderation.labels.message}
                    />
                    {showing.length}
                </p>
            {/if}
        </div>
    {/if}
</div>

<style>
    .queue {
        padding: var(--wordplay-spacing);
    }

    .report {
        border: solid var(--wordplay-border-width) var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
    }

    .flag {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    .remaining {
        font-size: var(--wordplay-small-font-size);
        margin-block-start: var(--wordplay-spacing);
    }
</style>

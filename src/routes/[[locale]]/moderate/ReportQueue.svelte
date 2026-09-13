<!-- The queue of reported things, for whoever is responsible for them (#938).

     Chat messages first, and since then how-tos, characters, and kits — so nothing
     here may say "message": a curator deciding about a drawing shouldn't be asked
     whether it violates the rules about what someone said.

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
    import Subheader from '@components/app/Subheader.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { CharactersDB, Creators, DB, HowTos, locales } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import {
        bareCharacterName,
        characterToSVG,
        type Character,
    } from '@db/characters/Character';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { firestore } from '@db/firebase';
    import moderate from '@db/moderation/moderate';
    import {
        allFlags,
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
    import type { SerializedKit } from '@db/kits/Kit';
    import KitCode from './KitCode.svelte';

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
                // Whole projects and galleries have their own queues; this
                // one is for what someone said — and, since #822, for what
                // someone drew, which is the same size of thing.
                .filter(
                    (data) =>
                        data.kind === 'chat' ||
                        data.kind === 'howto' ||
                        data.kind === 'character' ||
                        data.kind === 'kit',
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

    /** The drawing being decided about, when the subject is a character.
     *  Fetched rather than captured on the report: a report holds a title, and
     *  a decision about a picture has to be made by looking at the picture.
     *  The rules let a moderator read it (see the `mod` clause on
     *  /characters), and a curator reaches it through their own gallery. */
    let reportedCharacter = $state<Character | null>(null);
    $effect(() => {
        const report = current;
        if (report === undefined || report.kind !== 'character') {
            reportedCharacter = null;
            return;
        }
        let cancelled = false;
        CharactersDB.getByID(report.subject)
            .then((found) => {
                if (!cancelled) reportedCharacter = found ?? null;
            })
            .catch(() => {
                if (!cancelled) reportedCharacter = null;
            });
        return () => {
            cancelled = true;
        };
    });

    /**
     * The reported how-to itself.
     *
     * Fetched for the reason the character and the kit are: a report carries a
     * title, and a decision about prose has to be made by reading the prose. Until
     * #906 there was no way to report a how-to at all, so this branch never ran and
     * a how-to report would have rendered as an empty `<em>` — `SerializedReport.text`
     * carries a chat message's words and nothing else's.
     */
    let reportedHowTo = $state<HowTo | null>(null);
    $effect(() => {
        const report = current;
        if (report === undefined || report.kind !== 'howto') {
            reportedHowTo = null;
            return;
        }
        let cancelled = false;
        HowTos.getHowTo(report.subject)
            .then((howTo) => {
                if (!cancelled)
                    reportedHowTo = howTo instanceof HowTo ? howTo : null;
            })
            .catch(() => {
                if (!cancelled) reportedHowTo = null;
            });
        return () => {
            cancelled = true;
        };
    });

    /** The reported kit's newest published code.
     *
     *  Fetched for the reason the character is: a report carries a name, and a decision
     *  about code has to be made by reading the code. A kit's versions are what actually
     *  run in other people's projects, so the newest is what is shown. */
    let reportedKit = $state<SerializedKit | null>(null);
    $effect(() => {
        const report = current;
        if (report === undefined || report.kind !== 'kit') {
            reportedKit = null;
            return;
        }
        let cancelled = false;
        DB.loadKits()
            .then((kits) => kits.getByID(report.subject))
            .then((kit) => {
                if (!cancelled) reportedKit = kit ?? null;
            })
            .catch(() => {
                if (!cancelled) reportedKit = null;
            });
        return () => {
            cancelled = true;
        };
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
            <Subheader
                compact
                text={(l) => l.ui.gallerymoderation.labels.subject}
            />
            <div class="subject">
                <CreatorView
                    anonymize={false}
                    creator={current.author
                        ? (authors[current.author] ?? null)
                        : null}
                    loading={current.author
                        ? !(current.author in authors)
                        : false}
                />
                {#if current.kind === 'character'}
                    <!-- A drawing has to be looked at, so the queue shows the
                         character itself. Inert: deciding is the only thing to
                         do with it here. A report carries no picture, so this
                         is fetched; while it hasn't arrived, say so rather
                         than showing an empty box that reads as a decision
                         about nothing. -->
                    {#if reportedCharacter}
                        <div
                            class="character"
                            role="img"
                            aria-label={bareCharacterName(reportedCharacter)}
                        >
                            {@html characterToSVG(reportedCharacter, 128)}
                        </div>
                        <em>{reportedCharacter.name}</em>
                    {:else}
                        <Spinning />
                    {/if}
                {:else if current.kind === 'kit'}
                    <!-- Code has to be read to be judged, so the queue shows the kit's
                         newest published source, highlighted the way the editor shows
                         it — a wall of monospace is not something anyone can judge.
                         `RootView` and not `ConceptPreview`: it needs no project and no
                         context, provides the ones its subtree reads, and brings none of
                         the concept-link chrome, drag handling or output preview a
                         moderator has no use for. The same shape `ClipboardNotice` uses.
                         (This used to be a `<pre>`, on the grounds that rendering code
                         would put the language runtime on this page. It was already
                         here: `/moderate/+page.svelte` statically imports `ProjectView`.) -->
                    {#if reportedKit}
                        <em>{reportedKit.name}</em>
                        <KitCode kit={reportedKit} height="20em" />
                    {:else}
                        <Spinning />
                    {/if}
                {:else if current.kind === 'howto'}
                    <!-- Prose has to be read to be judged, and a report carries only
                         the title. Every language it was written in, rather than the
                         moderator's: the decision is about the whole document. -->
                    {#if reportedHowTo}
                        <em
                            >{reportedHowTo.getTitleInLocale(
                                $locales.getLocaleString(),
                            )}</em
                        >
                        {#each reportedHowTo.getText() as markup, index (index)}
                            <MarkupHTMLView {markup} />
                        {/each}
                    {:else}
                        <Spinning />
                    {/if}
                {:else}
                    <!-- The reported words, read from the report rather than the
                         chat: they were moved there so that hiding them was real. -->
                    <em>{current.text ?? ''}</em>
                {/if}
            </div>

            <Subheader
                compact
                text={(l) => l.ui.gallerymoderation.labels.reason}
            />
            <!-- One rule per row, stacked: these are full sentences, and a row flex laid
                 all four of them and the note field out on one line. `normal` rather than
                 `baseline` so a wrapped description doesn't drag its checkbox down with
                 it. Each checkbox is named by its own rule — one shared label left a
                 screen reader unable to tell them apart. -->
            <div class="flags">
                {#each allFlags() as flag (flag)}
                    <div class="flag">
                        <Checkbox
                            label={(l) => l.moderation.flags[flag]}
                            on={flags[flag] === true}
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
            </div>

            <!-- Labelled, so it doesn't read as a fifth rule sitting under the four
                 above it. -->
            <Subheader
                compact
                text={(l) => l.ui.gallerymoderation.note.description}
            />
            <TextField
                id="report-note"
                text={note}
                description={(l) => l.ui.gallerymoderation.note.description}
                placeholder={(l) => l.ui.gallerymoderation.note.placeholder}
                changed={(value) => (note = value)}
                fill
            />

            <Subheader
                compact
                text={(l) => l.ui.gallerymoderation.labels.action}
            />
            <div class="controls">
                <Button
                    background
                    tip={(l) => l.ui.gallerymoderation.view.tip}
                    label={(l) => l.ui.gallerymoderation.view.label}
                    action={() =>
                        localeGoto(
                            current.kind === 'character'
                                ? `/character/${current.subject}`
                                : // A kit's own page, by id. Without this a kit report
                                  // fell through to `/project/<kit id>`, which is not a
                                  // project and shows nothing.
                                  current.kind === 'kit'
                                  ? `/guide?kit=${encodeURIComponent(current.subject)}`
                                  : current.gallery === null
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
            </div>
            {#if showing.length > 1}
                <p class="remaining">
                    {$locales
                        .concretize((l) => l.ui.gallerymoderation.remaining, {
                            count: showing.length,
                        })
                        .toText()}
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
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: stretch;
    }

    /* A compact Subheader carries no margin — twelve other call sites rely on that — so
       the space that makes these read as headings over their content, rather than as one
       more sibling in an evenly spaced column, is set here. */
    .report :global(h2) {
        margin-block-start: var(--wordplay-spacing);
    }

    .report > :global(h2:first-child) {
        margin-block-start: 0;
    }

    .subject {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: flex-start;
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

    .character {
        display: block;
        width: 128px;
        height: 128px;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
    }

    .remaining {
        font-size: var(--wordplay-small-font-size);
        margin-block-start: var(--wordplay-spacing);
    }
</style>

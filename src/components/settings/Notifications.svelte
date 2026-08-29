<script module lang="ts">
    /** How far back a published how-to still counts as news.
     *
     *  Derived notices persist until dismissed, so unlike the old
     *  session-scoped push this needs a bound — without one, a creator who
     *  turned how-to notifications on would meet every how-to ever published. */
    const HowToWindow = 30 * 24 * 60 * 60 * 1000;
</script>

<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getAnnouncer, getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import { strikes } from '@db/creators/strikes.svelte';
    import { getFlagDescription, isModerator } from '@db/projects/Moderation';
    import {
        Chats,
        DB,
        Galleries,
        HowTos,
        Settings,
        howToNotifications,
        locales,
    } from '@db/Database';
    import noticeLink, { noticeAction } from '@db/moderation/noticeLink';
    import { dismiss, notices, written } from '@db/moderation/notices.svelte';
    import { NotificationsIcons } from '@db/settings/HowToNotificationsSetting';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { docToMarkup } from '@locale/LocaleText';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { localeGoto } from '@util/localeGoto';
    import type { SerializedNotice } from 'shared-types';
    import { untrack } from 'svelte';
    import { SvelteMap } from 'svelte/reactivity';

    let showDialog: boolean = $state(false);

    const announce = getAnnouncer();
    const user = getUser();

    /**
     * Notices synthesized from documents the reader can already see.
     *
     * Derived rather than delivered because writing one would mean a per-user
     * document write on the app's hottest paths — a bell entry for every chat
     * message. Only their dismissal is stored, which is what makes "clear" mean
     * the same thing for these as for the ones the server sends.
     */
    const synthesized = $state(new SvelteMap<string, SerializedNotice>());

    /** Everything to show: delivered and derived, newest first, minus whatever
     *  the reader has already put away. */
    const visible: SerializedNotice[] = $derived(
        [...written(), ...synthesized.values()]
            .filter(
                (notice) =>
                    !(notices.record?.dismissed ?? []).includes(notice.id),
            )
            .sort((a, b) => b.time - a.time),
    );

    // The unread state is shown by making the toolbar button salient (see the
    // Dialog button below); there's no popup. We still announce new
    // notifications to screen readers, since a color change alone isn't
    // perceivable to them.
    $effect(() => {
        // Carry the count, not just the fact. The old text was a constant, and
        // a live region handed the same string twice stays silent — so every
        // notification after the first was inaudible, which is the exact
        // failure this app's announcement rule exists to prevent.
        const count = visible.length;

        if (count > 0 && announce) {
            untrack(() => {
                if ($announce) {
                    $announce(
                        'notification',
                        $locales.getLanguages()[0],
                        $locales
                            .concretize(
                                (l) => l.ui.dialog.notifications.popup,
                                {
                                    count,
                                },
                            )
                            .toText(),
                    );
                }
            });
        }
    });

    /** A warning from a moderator (#193), from the server-written record. */
    $effect(() => {
        const record = strikes.record;
        if (record === undefined || record.count === 0) return;
        const last = record.strikes[record.strikes.length - 1];
        synthesized.set(`warning-${record.count}`, {
            // Keyed by the count, so a second warning reads as a second
            // notice rather than deduplicating against the first.
            id: `warning-${record.count}`,
            kind: 'warning',
            subject: {
                kind: 'project',
                id: last?.project ?? '',
                gallery: null,
            },
            title: '',
            time: last?.time ?? 0,
            count: record.count,
        });
    });

    /** A decision about whether a gallery this creator curates may be listed
     *  publicly (#1311), from the gallery document. */
    $effect(() => {
        const uid = $user?.uid;
        if (uid === undefined) return;
        for (const gallery of Galleries.accessibleGalleries.values()) {
            // Curators only: a creator can't ask for public listing, so a
            // decision about it isn't theirs to hear about.
            if (!gallery.hasCurator(uid)) continue;
            const state = gallery.getModeration();
            if (state !== 'approved' && state !== 'denied') continue;
            const at = gallery.getModeratedAt() ?? 0;
            // Keyed by state and time, since a re-denial after a fix has to
            // read as new rather than deduplicate against the first.
            const id = `gallery-${gallery.getID()}-${state}-${at}`;
            synthesized.set(id, {
                id,
                kind:
                    state === 'approved' ? 'gallery-listed' : 'gallery-denied',
                subject: {
                    kind: 'gallery',
                    id: gallery.getID(),
                    gallery: gallery.getID(),
                },
                title: gallery.getName($locales),
                time: at,
            });
        }
    });

    /** Unread conversations, and chat messages awaiting review. */
    $effect(() => {
        // Capture the uid up front: the per-chat work below awaits, and on
        // logout `$user` goes null mid-flight — reading `$user.uid` after an
        // await would then throw once per cached chat.
        const uid = $user?.uid;
        if (uid === undefined) return;

        [...Chats.chats.values()].forEach(async (chat) => {
            const itemID = chat.getProjectID();
            const isProject = chat.getType() === 'project';
            let galleryID: string | null = null;
            let title = '';

            // Name and gallery read from the stored document rather than a
            // constructed Project: this renders in the footer on every page,
            // and building a Project would pull in the language runtime.
            if (isProject) {
                const project = await DB.getProjectSummary(itemID);
                if (project) {
                    title = project.name;
                    galleryID = project.gallery;
                }
            } else {
                const howTo = await HowTos.getHowTo(itemID);
                if (howTo) {
                    title = howTo.getTitle();
                    galleryID = howTo.getHowToGalleryId();
                }
            }

            // Unread is durable state on the chat itself, so unlike the push
            // this replaces, a message that arrived while the tab was closed
            // still counts as news.
            if (chat.hasUnread(uid)) {
                const messages = chat.getMessages();
                synthesized.set(`chat-${itemID}`, {
                    id: `chat-${itemID}`,
                    kind: 'chat-message',
                    subject: {
                        kind: 'chat',
                        id: itemID,
                        gallery: isProject ? null : galleryID,
                    },
                    title,
                    time: messages[messages.length - 1]?.time ?? 0,
                });
            } else synthesized.delete(`chat-${itemID}`);
        });
    });

    /** How-tos published recently in a gallery this creator can see. */
    $effect(() => {
        if (!$howToNotifications) return;
        const now = Date.now();
        // The public list, already filtered to published ones.
        for (const howTo of HowTos.allAccessiblePublishedHowTos) {
            // The author's own choice not to announce it, which the push this
            // replaces also honored.
            if (!howTo.getNotifySubscribers()) continue;
            const at = howTo.getPublishedAt();
            if (at === null || now - at > HowToWindow) continue;
            synthesized.set(`howto-${howTo.getHowToId()}`, {
                id: `howto-${howTo.getHowToId()}`,
                kind: 'howto-published',
                subject: {
                    kind: 'howto',
                    id: howTo.getHowToId(),
                    gallery: howTo.getHowToGalleryId(),
                },
                title: howTo.getTitle(),
                time: at,
            });
        }
    });

    function header(notice: SerializedNotice) {
        let accessor: LocaleTextAccessor;
        switch (notice.kind) {
            case 'howto-published':
                accessor = (l) =>
                    l.ui.dialog.notifications.notification.howToHeader;
                break;
            case 'chat-message':
                accessor = (l) =>
                    notice.subject.gallery === null
                        ? l.ui.dialog.notifications.notification
                              .projectChatHeader
                        : l.ui.dialog.notifications.notification
                              .howToChatHeader;
                break;
            case 'review-requested':
                accessor = (l) =>
                    l.ui.dialog.notifications.notification.moderationHeader;
                break;
            case 'gallery-listed':
            case 'gallery-denied':
                // The gallery's name rides along, so a decision about a second
                // gallery isn't heard as a repeat of the first.
                return (
                    docToMarkup(
                        $locales.getMultilingualText((l) =>
                            notice.kind === 'gallery-listed'
                                ? l.moderation.gallery.notification.approved
                                : l.moderation.gallery.notification.denied,
                        ),
                    ).concretize($locales, { name: notice.title }) ?? ''
                );
            case 'warning':
                // Counted, so a second warning doesn't read identically to the
                // first — and because "which warning is this" is the single
                // most important thing the message carries.
                return (
                    docToMarkup(
                        $locales.getMultilingualText(
                            (l) => l.moderation.strike.notification,
                        ),
                    ).concretize($locales, { count: notice.count ?? 1 }) ?? ''
                );
            case 'reported':
                accessor = (l) =>
                    l.ui.dialog.notifications.notification.reportedHeader;
                break;
            case 'report-received':
                accessor = (l) =>
                    l.ui.dialog.notifications.notification.reportReceivedHeader;
                break;
            case 'decision':
                accessor = (l) =>
                    l.ui.dialog.notifications.notification.decisionHeader;
                break;
            case 'outcome':
                accessor = (l) =>
                    l.ui.dialog.notifications.notification.outcomeHeader;
                break;
            default:
                // A kind with no text here would render blank, which reads as
                // a broken app rather than as news. Fail where it's added.
                throw new Error(`Notice kind with no text: ${notice.kind}`);
        }

        return (
            docToMarkup($locales.getMultilingualText(accessor)).concretize(
                $locales,
                { title: notice.title, name: notice.title },
            ) ?? ''
        );
    }

    /** Whether the reader is in a position to review anything at all: a
     *  platform moderator, or the curator of any gallery. Not "is there
     *  something waiting" — a curator should be able to look at an empty queue
     *  rather than only find it when something lands in it. */
    let moderator = $state(false);
    $effect(() => {
        const who = $user;
        if (who === null || who === undefined) {
            moderator = false;
            return;
        }
        isModerator(who).then((is) => (moderator = is));
    });
    const responsible: boolean = $derived(
        moderator ||
            [...Galleries.accessibleGalleries.values()].some((gallery) =>
                $user ? gallery.hasCurator($user.uid) : false,
            ),
    );

    function go(notice: SerializedNotice) {
        showDialog = false;
        localeGoto(noticeAction(notice) ?? noticeLink(notice));
    }
</script>

<Dialog
    id="notifications"
    bind:show={showDialog}
    header={(l) => l.ui.dialog.notifications.header}
    explanation={(l) => l.ui.dialog.notifications.explanation}
    button={{
        tip: (l) => l.ui.dialog.notifications.open,
        icon: `🔔 ${visible.length}`,
        background: visible.length > 0 ? 'salient' : true,
    }}
>
    <Mode
        synced
        modes={(l) => l.ui.dialog.notifications.howToNotifications}
        choice={$howToNotifications ? 1 : 0}
        select={(choice) =>
            Settings.setHowToNotifications(choice === 1 ? true : false)}
        icons={NotificationsIcons}
    />
    <Button
        action={() => {
            const uid = $user?.uid;
            if (uid !== undefined)
                dismiss(
                    uid,
                    visible.map((notice) => notice.id),
                );
        }}
        background
        tip={(l) => l.ui.dialog.notifications.clearAll.tip}
        label={(l) => l.ui.dialog.notifications.clearAll.label}
    />
    <!-- The way in to the moderation queue. It lives here because the queue is
         only ever reached by someone who was told there is something in it, and
         because most people are never in a position to review anything — which
         is why this is not in the footer or on the landing page. Before this,
         /moderate was reachable only from an unlocalized sentence in the
         account settings, below Delete Account. -->
    {#if responsible}
        <Button
            action={() => {
                showDialog = false;
                localeGoto('/moderate');
            }}
            background
            tip={(l) => l.ui.dialog.notifications.moderate.tip}
            label={(l) => l.ui.dialog.notifications.moderate.label}
        />
    {/if}
    {#each visible as notice (notice.id)}
        <div class="notification">
            <div class="notification-header">
                <MarkupHTMLView inline markup={header(notice)} />
                <Button
                    icon={CANCEL_SYMBOL}
                    action={() => {
                        const uid = $user?.uid;
                        if (uid !== undefined) dismiss(uid, [notice.id]);
                    }}
                    tip={(l) => l.ui.dialog.notifications.delete}
                />
            </div>
            {#if notice.flags && notice.flags.length > 0}
                <div class="reason">
                    <LocalizedText
                        path={(l) =>
                            l.ui.dialog.notifications.notification.because}
                    />
                    <ul>
                        {#each notice.flags as flag (flag)}
                            {@const description = getFlagDescription(
                                flag,
                                $locales,
                            )}
                            {#if description}
                                <li><MarkupHTMLView markup={description} /></li>
                            {/if}
                        {/each}
                    </ul>
                </div>
            {/if}
            {#if notice.note}
                <div class="reason">
                    <LocalizedText
                        path={(l) =>
                            l.ui.dialog.notifications.notification.note}
                    />
                    <em>{notice.note}</em>
                </div>
            {/if}
            <Button
                tip={(l) => l.ui.dialog.notifications.notification.link}
                icon={'🔗'}
                action={() => go(notice)}
            />
        </div>
    {/each}
</Dialog>

<style>
    .notification {
        border: solid var(--wordplay-border-width) var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        margin-bottom: var(--wordplay-spacing);
    }

    .reason {
        margin-block-start: var(--wordplay-spacing);
        font-size: var(--wordplay-small-font-size);
    }

    .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
</style>

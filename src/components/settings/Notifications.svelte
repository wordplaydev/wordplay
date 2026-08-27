<script module lang="ts">
    export type NotificationData = {
        title: string;
        galleryID: string | undefined;
        itemID: string;
        type:
            // new how-to created
            | 'howto'
            // new chat in a project
            | 'projectchat'
            // new chat in a how-to
            | 'howtochat'
            // message in a project chat needs moderation
            | 'projectmoderation'
            // message in a how-to chat needs moderation
            | 'howtomoderation'
            // a moderator warned this creator about something they made public
            | 'strike';
    };

    // list of chats that need moderation action from the current user
    // maps message ID to its corresponding serialized message, chat, and gallery ID
    export let modNeeded = $state(
        new SvelteMap<string, [SerializedMessage, Chat, string]>(),
    );
</script>

<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getAnnouncer, getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { SerializedMessage } from '@db/chats/ChatDatabase.svelte';
    import {
        DB,
        Chats,
        Galleries,
        howToNotifications,
        HowTos,
        locales,
        Settings,
    } from '@db/Database';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import { NotificationsIcons } from '@db/settings/HowToNotificationsSetting';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { docToMarkup } from '@locale/LocaleText';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { untrack } from 'svelte';
    import { SvelteMap } from 'svelte/reactivity';
    import { notifications } from '@db/notifications.svelte';
    import { strikes } from '@db/creators/strikes.svelte';
    import { localeGoto } from '@util/localeGoto';

    let showDialog: boolean = $state(false);

    const announce = getAnnouncer();

    // The unread state is shown by making the toolbar button salient (see the
    // Dialog button below); there's no popup. We still announce new
    // notifications to screen readers, since a color change alone isn't
    // perceivable to them.
    $effect(() => {
        // Carry the count, not just the fact. The old text was a constant, and
        // a live region handed the same string twice stays silent — so every
        // notification after the first was inaudible, which is the exact
        // failure this app's announcement rule exists to prevent.
        const count = notifications.size;

        if (count > 0 && announce) {
            untrack(() => {
                if ($announce) {
                    $announce(
                        'notification',
                        $locales.getLanguages()[0],
                        $locales
                            .concretize(
                                (l) => l.ui.dialog.notifications.popup,
                                { count },
                            )
                            .toText(),
                    );
                }
            });
        }
    });

    // A warning from a moderator (#193). Derived from the server-written record
    // rather than pushed, like every other notification here, and keyed by the
    // count so a second warning is a second notification rather than a
    // duplicate of the first.
    $effect(() => {
        const record = strikes.record;
        if (record === undefined || record.count === 0) return;
        notifications.set(`strike-${record.count}`, {
            title: '',
            galleryID: undefined,
            itemID: `strike-${record.count}`,
            type: 'strike',
        });
    });

    // get messages that need moderation from this user
    // user is responsible for moderating chats that are in their galleries
    const user = getUser();

    $effect(() => {
        // Capture the uid up front: the per-chat work below awaits, and on
        // logout `$user` goes null mid-flight — reading `$user.uid` after an
        // await would then throw once per cached chat.
        const uid = $user?.uid;
        if (uid === undefined) return;

        [...Chats.chats.values()].forEach(async (chat) => {
            let galleryID: string | null = null;
            // Name and gallery read from the stored document rather than a
            // constructed Project: this renders in the footer on every page,
            // and building a Project would pull in the language runtime.
            let project: { name: string; gallery: string | null } | undefined;
            let howTo: HowTo | undefined | false;
            const itemID = chat.getProjectID();

            if (chat.getType() === 'project') {
                project = await DB.getProjectSummary(itemID);
                if (project) galleryID = project.gallery;
            } else {
                howTo = await HowTos.getHowTo(itemID);
                if (howTo) galleryID = howTo.getHowToGalleryId();
            }

            // No gallery, or creator doesn't have access to gallery? No need for notifications.
            if (
                galleryID === null ||
                !Galleries.accessibleGalleries.has(galleryID)
            )
                return;

            const gallery = await Galleries.get(galleryID);
            chat.getMessagesPendingModeration(uid, gallery).forEach(
                (message) => {
                    modNeeded.set(message.id, [message, chat, galleryID!]);
                    let type =
                        chat.getType() === 'project'
                            ? 'projectmoderation'
                            : 'howtomoderation';

                    notifications.set(itemID + type, {
                        title:
                            chat.getType() === 'project'
                                ? project
                                    ? project.name
                                    : ''
                                : howTo
                                  ? howTo.getTitle()
                                  : '',
                        galleryID,
                        itemID: itemID,
                        type: type,
                    } as NotificationData);
                },
            );
        });
    });

    function makeNotificationHeader(notification: NotificationData) {
        let accessor: LocaleTextAccessor;
        switch (notification.type) {
            case 'howto':
                accessor = (l) =>
                    l.ui.dialog.notifications.notification.howToHeader;
                break;
            case 'howtochat':
                accessor = (l) =>
                    l.ui.dialog.notifications.notification.howToChatHeader;
                break;
            case 'projectchat':
                accessor = (l) =>
                    l.ui.dialog.notifications.notification.projectChatHeader;
                break;
            case 'projectmoderation':
            case 'howtomoderation':
                accessor = (l) =>
                    l.ui.dialog.notifications.notification.moderationHeader;
                break;
            case 'strike':
                // Counted, so a second warning doesn't read identically to the
                // first — and because "which warning is this" is the single
                // most important thing the message carries.
                return (
                    docToMarkup(
                        $locales.getMultilingualText(
                            (l) => l.moderation.strike.notification,
                        ),
                    ).concretize($locales, {
                        count: strikes.record?.count ?? 1,
                    }) ?? ''
                );
            default:
                throw Error(`Unknown notification type: ${notification.type}`);
        }

        return (
            docToMarkup($locales.getMultilingualText(accessor)).concretize(
                $locales,
                { title: notification.title },
            ) ?? ''
        );
    }
</script>

<Dialog
    id="notifications"
    bind:show={showDialog}
    header={(l) => l.ui.dialog.notifications.header}
    explanation={(l) => l.ui.dialog.notifications.explanation}
    button={{
        tip: (l) => l.ui.dialog.notifications.open,
        icon: `🔔 ${notifications.size}`,
        background: notifications.size > 0 ? 'salient' : true,
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
            notifications.clear();
        }}
        background
        tip={(l) => l.ui.dialog.notifications.clearAll.tip}
        label={(l) => l.ui.dialog.notifications.clearAll.label}
    />
    {#each notifications.values() as notification, i (i)}
        <div class="notification">
            <div class="notification-header">
                <MarkupHTMLView
                    inline
                    markup={makeNotificationHeader(notification)}
                />
                <Button
                    icon={CANCEL_SYMBOL}
                    action={() =>
                        notifications.delete(
                            notification.itemID + notification.type,
                        )}
                    tip={(l) => l.ui.dialog.notifications.delete}
                />
            </div>
            {#if notification.type === 'strike'}
                <Button
                    tip={(l) => l.ui.dialog.notifications.notification.link}
                    icon={'🔗'}
                    action={() => {
                        showDialog = false;
                        localeGoto('/rights');
                    }}
                />
            {:else if notification.type === 'projectchat'}
                <Button
                    tip={(l) => l.ui.dialog.notifications.notification.link}
                    icon={'🔗'}
                    action={() => {
                        showDialog = false;
                        localeGoto(`/project/${notification.itemID}`);
                    }}
                />
            {:else if notification.type === 'projectmoderation' || notification.type === 'howtomoderation'}
                <Button
                    tip={(l) => l.ui.dialog.notifications.notification.link}
                    icon={'🔗'}
                    action={() => {
                        showDialog = false;
                        localeGoto('/galleries/moderation');
                    }}
                />
            {:else}
                <Button
                    tip={(l) => l.ui.dialog.notifications.notification.link}
                    icon={'🔗'}
                    action={() => {
                        showDialog = false;
                        localeGoto(
                            `/gallery/${notification.galleryID}/howto?id=${notification.itemID}`,
                        );
                    }}
                />
            {/if}
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

    .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
</style>

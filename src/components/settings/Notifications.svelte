<script module lang="ts">
    export type NotificationData = {
        title: string;
        galleryID?: string;
        itemID: string;
        type: 'howto' | 'projectchat' | 'howtochat';
    };
</script>

<script lang="ts">
    import { goto } from '$app/navigation';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getAnnouncer } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import { howToNotifications, locales, Settings } from '@db/Database';
    import { NotificationsIcons } from '@db/settings/HowToNotificationsSetting';
    import { docToMarkup } from '@locale/LocaleText';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { untrack } from 'svelte';
    import { notifications } from '../../routes/+layout.svelte';

    let showDialog: boolean = $state(false);
    let showPopup: boolean = $state(false);

    const announce = getAnnouncer();

    $effect(() => {
        notifications;

        showPopup = notifications.size > 0;

        if (announce) {
            untrack(() => {
                if ($announce) {
                    $announce(
                        'notification',
                        $locales.getLanguages()[0],
                        $locales.get((l) => l.ui.dialog.notifications.popup),
                    );
                }
            });
        }
    });
</script>

{#if showPopup}
    <div class="popup">
        <Button
            action={() => {
                showDialog = true;
                showPopup = false;
            }}
            tip={(l) => l.ui.dialog.notifications.open}
            label={(l) => l.ui.dialog.notifications.popup}
        />
        <Button
            icon={CANCEL_SYMBOL}
            action={() => (showPopup = false)}
            tip={(l) => l.ui.dialog.notifications.delete}
        />
    </div>
{/if}

<Dialog
    bind:show={showDialog}
    header={(l) => l.ui.dialog.notifications.header}
    explanation={(l) => l.ui.dialog.notifications.explanation}
    button={{
        tip: (l) => l.ui.dialog.notifications.open,
        icon: `🔔 ${notifications.size}`,
    }}
>
    <Mode
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
        tip={(l) => l.ui.dialog.notifications.clearAll.tip}
        label={(l) => l.ui.dialog.notifications.clearAll.label}
    />
    {#each notifications as notification, i (i)}
        <div class="notification">
            <div class="notification-header">
                <MarkupHTMLView
                    inline
                    markup={docToMarkup(
                        $locales.get((l) =>
                            notification.type === 'howto'
                                ? l.ui.dialog.notifications.notification
                                      .howToHeader
                                : notification.type === 'howtochat'
                                  ? l.ui.dialog.notifications.notification
                                        .howToChatHeader
                                  : l.ui.dialog.notifications.notification
                                        .projectChatHeader,
                        ),
                    ).concretize($locales, [notification.title]) ?? ''}
                />
                <Button
                    icon={CANCEL_SYMBOL}
                    action={() => notifications.delete(notification)}
                    tip={(l) => l.ui.dialog.notifications.delete}
                />
            </div>
            {#if notification.type === 'projectchat'}
                <Button
                    tip={(l) => l.ui.dialog.notifications.notification.link}
                    icon={'🔗'}
                    action={() => {
                        showDialog = false;
                        goto(`/project/${notification.itemID}`);
                    }}
                />
            {:else}
                <Button
                    tip={(l) => l.ui.dialog.notifications.notification.link}
                    icon={'🔗'}
                    action={() => {
                        showDialog = false;
                        goto(
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

    .popup {
        border: solid var(--wordplay-border-width) var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        margin-bottom: var(--wordplay-spacing);
        position: absolute;
        top: var(--wordplay-spacing);
        right: var(--wordplay-spacing);
        background-color: var(--wordplay-background);
    }
</style>

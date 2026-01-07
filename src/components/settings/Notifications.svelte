<script module lang="ts">
    export type NotificationData = {
        title: string;
        galleryID?: string;
        projectID?: string;
        type: 'howto' | 'projectchat' | 'howtochat';
    };
</script>

<script lang="ts">
    import Link from '@components/app/Link.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import { howToNotifications, locales, Settings } from '@db/Database';
    import { NotificationsIcons } from '@db/settings/HowToNotificationsSetting';
    import { docToMarkup } from '@locale/LocaleText';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { notifications } from '../../routes/+layout.svelte';

    let show: boolean = $state(false);
</script>

<Dialog
    bind:show
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
                <Link
                    to={`/project/${notification.projectID}`}
                    label={(l) => l.ui.dialog.notifications.notification.link}
                />
            {:else}
                <Link
                    to={`/gallery/${notification.galleryID}/howto`}
                    label={(l) => l.ui.dialog.notifications.notification.link}
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

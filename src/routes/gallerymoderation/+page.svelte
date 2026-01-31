<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Loading from '@components/app/Loading.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import { modNeeded } from '@components/settings/Notifications.svelte';
    import { Chats } from '@db/Database';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { SerializedMessage } from '@db/chats/ChatDatabase.svelte';
    import ModerationItem from './ModerationItem.svelte';

    let user = getUser();

    /** Deletes the message as a result of moderator action.
     * Keeps the text for bookkeeping, but marks the message as "removed"
     */
    function removeMessage(message: SerializedMessage, chat: Chat) {
        if (!chat || !$user) return;
        Chats.updateChat(
            chat.withModeratedMessage(message, 'removed', $user.uid),
            true,
        );
        modNeeded.delete(message.id);
    }

    /** Does not take moderation action on the message, and returns
     * the message to its original text. Allows someone else to report
     * it again in the future.
     */
    function approveMessage(message: SerializedMessage, chat: Chat) {
        if (!chat || !$user) return;
        Chats.updateChat(
            chat.withModeratedMessage(message, 'approved', $user.uid),
            true,
        );
        modNeeded.delete(message.id);
    }
</script>

<Writing>
    {#if $user === null}
        <Notice text={(l) => l.ui.gallerymoderation.error} />
    {:else if $user === undefined}
        <Loading />
    {:else}
        <Header text={(l) => l.ui.gallerymoderation.header} />
        <MarkupHTMLView markup={(l) => l.ui.gallerymoderation.description} />

        {#if modNeeded.size > 0}
            {#each modNeeded.values() as [message, chat, galleryID]}
                <ModerationItem
                    {message}
                    {chat}
                    {galleryID}
                    {removeMessage}
                    {approveMessage}
                />
            {/each}
        {:else}
            <Notice
                ><MarkupHTMLView
                    markup={(l) => l.ui.gallerymoderation.empty}
                /></Notice
            >
        {/if}
    {/if}
</Writing>

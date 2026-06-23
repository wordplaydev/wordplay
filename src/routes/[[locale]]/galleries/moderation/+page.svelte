<script lang="ts">
    import Loading from '@components/app/Loading.svelte';
    import Notice from '@components/app/Notice.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
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
        Chats.moderateMessage(chat, message, 'removed', $user.uid);
        modNeeded.delete(message.id);
    }

    /** Does not take moderation action on the message, and returns
     * the message to its original text. Allows someone else to report
     * it again in the future.
     */
    function approveMessage(message: SerializedMessage, chat: Chat) {
        if (!chat || !$user) return;
        Chats.moderateMessage(chat, message, 'approved', $user.uid);
        modNeeded.delete(message.id);
    }
</script>

{#if $user === undefined}
    <!-- Auth hasn't resolved yet: overlay the page with a loader, alone. -->
    <Loading />
{:else}
    <Writing>
        {#if $user === null}
            <PageHeader />
            <Notice text={(l) => l.ui.gallerymoderation.error} />
        {:else}
            <PageHeader
                header={(l) => l.ui.gallerymoderation.header}
                description={(l) => l.ui.gallerymoderation.description}
            />

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
{/if}

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

    function removeMessage(message: SerializedMessage, chat: Chat) {
        if (!chat || !$user) return;
        Chats.updateChat(
            chat.withModeratedMessage(message, 'removed', $user.uid),
            true,
        );
        modNeeded.delete(message.id);
    }

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
            <MarkupHTMLView markup={(l) => l.ui.gallerymoderation.empty} />
        {/if}
    {/if}
</Writing>

<script lang="ts">
    import { goto } from '$app/navigation';
    import CreatorView from '@components/app/CreatorView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { SerializedMessage } from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { Creators } from '@db/Database';

    interface Props {
        message: SerializedMessage;
        chat: Chat;
        galleryID: string;
        removeMessage: (message: SerializedMessage, chat: Chat) => void;
        approveMessage: (message: SerializedMessage, chat: Chat) => void;
    }

    let { message, chat, galleryID, removeMessage, approveMessage }: Props =
        $props();

    let creator: Creator | null = $state(null);
    let reporter: Creator | null = $state(null);

    $effect(() => {
        Creators.getCreatorsByUIDs([
            message.creator,
            message.reporter ?? '',
        ]).then((creators) => {
            creator = creators[message.creator] ?? null;
            reporter = message.reporter
                ? (creators[message.reporter] ?? null)
                : null;
        });
    });
</script>

<div class="moderationitem">
    <Labeled label={(l) => l.ui.gallerymoderation.labels.message}>
        <CreatorView anonymize={false} {creator} />
        {message.text}
    </Labeled>
    <Labeled label={(l) => l.ui.gallerymoderation.labels.reporter}>
        <CreatorView anonymize={false} creator={reporter} /></Labeled
    >
    <Labeled label={(l) => l.ui.gallerymoderation.labels.action}>
        <Button
            background
            tip={(l) => l.ui.gallerymoderation.view.tip}
            label={(l) => l.ui.gallerymoderation.view.label}
            action={() => {
                chat.getType() === 'project'
                    ? goto(`/project/${chat.getProjectID()}`)
                    : goto(
                          `/gallery/${galleryID}/howto?id=${chat.getProjectID()}`,
                      );
            }}
        />
        <Button
            background
            tip={(l) => l.ui.gallerymoderation.remove.tip}
            label={(l) => l.ui.gallerymoderation.remove.label}
            action={() => removeMessage(message, chat)}
        />
        <Button
            background
            tip={(l) => l.ui.gallerymoderation.keep.tip}
            label={(l) => l.ui.gallerymoderation.keep.label}
            action={() => approveMessage(message, chat)}
        /></Labeled
    >
</div>

<style>
    .moderationitem {
        border: solid var(--wordplay-border-width) var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        margin-bottom: var(--wordplay-spacing);
    }
</style>

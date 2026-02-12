<script lang="ts">
    import { goto } from '$app/navigation';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import TileMessage from '@components/project/TileMessage.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import { type SerializedMessage } from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { Chats, Galleries } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import type Project from '@db/projects/Project';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { tick, untrack } from 'svelte';
    import CreatorView from '../CreatorView.svelte';
    import Loading from '../Loading.svelte';

    interface Props {
        chat: Chat | undefined | null | false;
        creators: Record<string, Creator | null>;
        galleryID: string | undefined | null;
        project?: Project;
        howTo?: HowTo;
    }

    let {
        chat,
        creators,
        galleryID,
        project = undefined,
        howTo = undefined,
    }: Props = $props();

    const user = getUser();
    let newMessage = $state('');
    let newMessageView = $state<HTMLTextAreaElement | undefined>();

    let scrollerView = $state<HTMLDivElement | undefined>();

    // get the gallery from the gallery ID
    let gallery: Gallery | undefined = $state(undefined);
    $effect(() => {
        if (galleryID) {
            Galleries.get(galleryID).then((g) => {
                if (g) gallery = g;
            });
        }
    });

    // When the project changes, mark read if it was unread and scroll.
    $effect(() => {
        if (chat && $user && chat.hasUnread($user.uid)) {
            untrack(() => {
                Chats.updateChat(chat.asRead($user.uid), true);
            });
        }

        // After the chat is visible, scroll to the bottom.
        tick().then(() => {
            if (scrollerView)
                scrollerView.scrollTop = scrollerView.scrollHeight;
        });
    });

    function submitMessage() {
        if (newMessage.trim() === '') return;
        if (!chat) return;
        Chats.addMessage(chat, newMessage);
        newMessage = '';
        tick().then(() => {
            if (newMessageView)
                setKeyboardFocus(
                    newMessageView,
                    'Focus on chat after submitting',
                );
        });
    }

    function startChat() {
        if (project) Chats.addChat(project, gallery);
        else if (howTo) Chats.addChatToHowTo(howTo, gallery);
    }

    function areSameDay(a: Date, b: Date): boolean {
        return (
            a.getDate() === b.getDate() &&
            a.getMonth() === b.getMonth() &&
            a.getFullYear() === b.getFullYear()
        );
    }

    function deleteMessage(chat: Chat, message: SerializedMessage) {
        if (!chat) return;
        Chats.updateChat(chat.withoutMessage(message), true);
    }

    // moderation dialog
    let showModerationDialog: boolean = $state(false);

    // user is a moderator of a chat if the chat is in a gallery and the user is a curator of that gallery
    let isModerator: boolean = $state(false);
    $effect(() => {
        isModerator =
            gallery !== undefined &&
            $user !== null &&
            $user !== undefined &&
            gallery.hasCurator($user.uid);
    });

    function reportMessage(chat: Chat, message: SerializedMessage) {
        if (!chat || !$user) return;
        Chats.updateChat(chat.withReportedMessage(message, $user.uid), true);

        showModerationDialog = false;
    }
</script>

{#snippet message(chat: Chat, msg: SerializedMessage)}
    {@const date = new Date(msg.time)}
    <div class="message" class:creator={$user?.uid === msg.creator}>
        <div class="meta"
            ><CreatorView
                chrome={false}
                anonymize={false}
                creator={creators[msg.creator]}
                fade={!chat.isEligible(msg.creator)}
            />
            <div class="when"
                >{areSameDay(new Date(), date)
                    ? date.toLocaleTimeString(undefined, { timeStyle: 'short' })
                    : date.toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                      })}</div
            >
            {#if $user?.uid === msg.creator && msg.text !== null && (msg.moderation === undefined || msg.moderation === 'approved')}
                <Button
                    tip={(l) => l.ui.collaborate.button.delete}
                    action={() => deleteMessage(chat, msg)}
                    icon={CANCEL_SYMBOL}
                ></Button>
            {/if}
        </div>
        <div
            class="what"
            style:border={isModerator && msg.moderation === 'pending'
                ? 'solid var(--wordplay-border-width) var(--wordplay-warning)'
                : ''}
        >
            {#if msg.text === null}
                <em>
                    <LocalizedText
                        path={(l) => l.ui.collaborate.error.deleted}
                    />
                </em>
            {:else if msg.moderation === 'pending'}
                {#if isModerator}
                    <MarkupHTMLView
                        markup={msg.text.replaceAll('\n', '\n\n')}
                    />
                {:else}
                    <em>
                        <LocalizedText
                            path={(l) => l.ui.collaborate.moderation.pending}
                        />
                    </em>
                {/if}
            {:else if msg.moderation === 'removed'}
                <em>
                    <LocalizedText
                        path={(l) => l.ui.collaborate.moderation.removed}
                    />
                </em>
            {:else}
                <MarkupHTMLView markup={msg.text.replaceAll('\n', '\n\n')} />
            {/if}
        </div>
        {#if !($user?.uid === msg.creator) && galleryID && (msg.moderation === undefined || msg.moderation === 'approved')}
            <Dialog
                bind:show={showModerationDialog}
                header={(l) => l.ui.collaborate.moderation.header}
                explanation={(l) => l.ui.collaborate.moderation.explanation}
                button={{
                    tip: (l) => l.ui.collaborate.moderation.report.tip,
                    icon: '🚩',
                }}
            >
                <Button
                    background
                    tip={(l) => l.ui.collaborate.moderation.report.tip}
                    label={(l) => l.ui.collaborate.moderation.report.label}
                    action={() => reportMessage(chat, msg)}
                />
            </Dialog>
        {:else if isModerator && msg.moderation === 'pending'}
            <Button
                tip={(l) => l.ui.collaborate.moderation.moderate.tip}
                label={(l) => l.ui.collaborate.moderation.moderate.label}
                action={() => {
                    goto('/galleries/moderation');
                }}
            />
        {/if}
    </div>
{/snippet}

{#if chat === null}
    <Loading></Loading>
{:else if chat === false}
    <TileMessage error>
        <p><LocalizedText path={(l) => l.ui.collaborate.error.offline} /></p>
    </TileMessage>
{:else if chat == undefined}
    <TileMessage>
        <p
            ><Button
                tip={(l) => l.ui.collaborate.button.start.tip}
                action={startChat}
                background
                ><LocalizedText
                    path={(l) => l.ui.collaborate.button.start.label}
                /></Button
            ></p
        >
    </TileMessage>
{:else}
    {#if galleryID}
        <MarkupHTMLView markup={(l) => l.ui.collaborate.moderation.inGallery} />
    {/if}
    <div class="scroller" bind:this={scrollerView}>
        <div class="messages">
            {#each chat.getMessages() as msg}
                {@render message(chat, msg)}
            {:else}
                <Note
                    ><LocalizedText
                        path={(l) => l.ui.collaborate.error.empty}
                    /></Note
                >
            {/each}
        </div>
    </div>
    <form class="new" data-sveltekit-keepfocus>
        <div class="controls">
            <FormattedEditor
                id="new-message"
                placeholder={(l) => l.ui.collaborate.field.message.placeholder}
                description={(l) => l.ui.collaborate.field.message.description}
                bind:view={newMessageView}
                bind:text={newMessage}
            />
            <Button
                submit
                active={chat !== undefined && newMessage.trim() !== ''}
                tip={(l) => l.ui.collaborate.button.submit.tip}
                action={submitMessage}
                background
                ><LocalizedText
                    path={(l) => l.ui.collaborate.button.submit.label}
                /></Button
            >
        </div>
    </form>
{/if}

<style>
    .scroller {
        overflow-y: auto;
        overflow-x: clip;
        height: 100%;
        width: 100%;
        margin-block-start: auto;
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .messages {
        display: flex;
        flex-direction: column;
        padding-top: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
    }

    .new {
        display: flex;
        flex-direction: column;
        gap: calc(0.5 * var(--wordplay-spacing));
    }

    .controls {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .message {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        width: 90%;
        margin-block-end: var(--wordplay-spacing);
    }

    .creator.message {
        align-self: end;
        align-items: end;
    }

    .meta {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    .when {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
        white-space: nowrap;
    }

    .what {
        padding: var(--wordplay-spacing);
        background: var(--wordplay-alternating-color);
        font-size: var(--wordplay-small-font-size);
        border-radius: var(--wordplay-border-radius);
        width: fit-content;
    }
</style>

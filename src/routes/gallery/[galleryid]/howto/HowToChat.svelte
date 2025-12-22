<!-- 
Copied from src/components/app/chat/CollaborateView.svelte 
with modifications made to work for HowTos, rather than chats, and removing the "add collaborators" section
also, queries for the chat in this component rather than being passed in as a prop.

This chat component enables communication between gallery collaborators of a how-to
 -->
<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import TileMessage from '@components/project/TileMessage.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import { type SerializedMessage } from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { Chats, Creators, Galleries } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { tick, untrack } from 'svelte';
    import CreatorView from '../../../../components/app/CreatorView.svelte';
    import Loading from '../../../../components/app/Loading.svelte';
    import HowToPrompt from './HowToPrompt.svelte';

    interface Props {
        howTo: HowTo;
    }

    let { howTo }: Props = $props();

    const user = getUser();

    // Get the chat for the how-to, if there is one.
    // undefined: there isn't one
    // null: we're still loading
    // false: couldn't load it.
    let chat = $state<Chat | undefined | null | false>(null);
    $effect(() => {
        // When the project or chat change, get the chat.
        Chats.getChatHowTo(howTo).then((retrievedChat) => {
            chat = retrievedChat;
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

    // Load the gallery if it exists.
    let gallery = $state<Gallery | undefined>(undefined);
    $effect(() => {
        const galleryID = howTo.getHowToGalleryId();
        if (galleryID) {
            Galleries.get(galleryID).then((g) => {
                gallery = g;
            });
        } else gallery = undefined;
    });

    let newMessage = $state('');
    let newMessageView = $state<HTMLTextAreaElement | undefined>();
    let scrollerView = $state<HTMLDivElement | undefined>();

    // When the howTo changes, mark read if it was unread and scroll.
    $effect(() => {
        if (chat && $user && chat.hasUnread($user.uid)) {
            untrack(() => {
                if (chat) Chats.updateChat(chat.asRead($user.uid), true);
            });
        }

        // After the chat is visible, scroll to the bottom.
        tick().then(() => {
            if (scrollerView)
                scrollerView.scrollTop = scrollerView.scrollHeight;
        });
    });

    let creators: Record<string, Creator | null> = $state({});

    // Set the creators to whatever user IDs we have.
    $effect(() => {
        const owner = howTo.getCreator();
        // We async load all participants, regardless of their chat eligibility, since we need to render
        // their names.
        Creators.getCreatorsByUIDs(
            chat
                ? [...chat.getAllParticipants(), ...(owner ? [owner] : [])]
                : owner
                  ? [owner]
                  : [],
        ).then((map) => (creators = map));
    });

    function startChat() {
        if (gallery) Chats.addChatToHowTo(howTo, gallery);
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
            {#if $user?.uid === msg.creator && msg.text !== null}
                <Button
                    tip={(l) => l.ui.collaborate.button.delete}
                    action={() => deleteMessage(chat, msg)}
                    icon={CANCEL_SYMBOL}
                ></Button>
            {/if}
        </div>
        <div class="what"
            >{#if msg.text === null}<em
                    ><LocalizedText
                        path={(l) => l.ui.collaborate.error.deleted}
                    /></em
                >{:else}<MarkupHTMLView
                    markup={msg.text.replaceAll('\n', '\n\n')}
                />{/if}</div
        >
    </div>
{/snippet}

<HowToPrompt text={(l) => l.ui.howto.viewHowTo.chatPrompt} />
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

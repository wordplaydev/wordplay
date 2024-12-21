<!-- 
 This chat component enables communication between project collaborators and owners of the gallery that a project is in. 
 -->
<script lang="ts">
    import { getUser } from '@components/project/Contexts';
    import TileMessage from '@components/project/TileMessage.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { type SerializedMessage } from '@db/ChatDatabase.svelte';
    import type Chat from '@db/ChatDatabase.svelte';
    import type { Creator } from '@db/CreatorDatabase';
    import { Chats, Creators, locales } from '@db/Database';
    import type Project from '@models/Project';
    import CreatorView from '../CreatorView.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { tick } from 'svelte';
    import Loading from '../Loading.svelte';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Link from '../Link.svelte';

    const { project }: { project: Project } = $props();

    const user = getUser();

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

    let chat = $state<Chat | undefined | null>(null);
    let newMessage = $state('');
    let newMessageView = $state<HTMLInputElement | undefined>();
    let scrollerView = $state<HTMLDivElement | undefined>();

    $effect(() => {
        Chats.getChat(project).then((c) => {
            chat = c;
            tick().then(() => {
                if (scrollerView)
                    scrollerView.scrollTop = scrollerView.scrollHeight;
            });
        });
    });

    let creators: Record<string, Creator | null> = $state({});

    // Set the creators to whatever user IDs we have.
    $effect(() => {
        if (chat)
            // We async load all participants, regardless of their chat eligibility, since we need to render
            // their names.
            Creators.getCreatorsByUIDs(chat.getAllParticipants()).then(
                (map) => (creators = map),
            );
        else creators = {};
    });

    function startChat() {
        Chats.addChat(project);
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
                    tip={$locales.get((l) => l.ui.chat.button.delete)}
                    action={() => deleteMessage(chat, msg)}
                >
                    {CANCEL_SYMBOL}</Button
                >
            {/if}
        </div>
        <div class="what"
            >{#if msg.text === null}<em
                    >{$locales.get((l) => l.ui.chat.error.deleted)}</em
                >{:else}<MarkupHTMLView markup={msg.text} />{/if}</div
        >
    </div>
{/snippet}

{#if project.getOwner() === null}
    <TileMessage error>
        <p>{$locales.get((l) => l.ui.chat.error.unowned)}</p>
    </TileMessage>
{:else if chat === null}
    <Loading></Loading>
{:else if !chat}
    <TileMessage>
        <p>{$locales.get((l) => l.ui.chat.prompt)}</p>
        <p
            ><Button
                tip={$locales.get((l) => l.ui.chat.button.start.tip)}
                action={startChat}
                background
                >{$locales.get((l) => l.ui.chat.button.start.label)}</Button
            ></p
        >
    </TileMessage>
{:else}
    <section class="chat" aria-label={$locales.get((l) => l.ui.chat.label)}>
        <div class="scroller" bind:this={scrollerView}>
            <div class="messages">
                {#each chat.getMessages() as msg}
                    {@render message(chat, msg)}
                {:else}
                    <Note>{$locales.get((l) => l.ui.chat.error.empty)}</Note>
                {/each}
            </div>
        </div>
        <form class="new" data-sveltekit-keepfocus>
            <div class="controls">
                <TextField
                    fill
                    placeholder={$locales.get(
                        (l) => l.ui.chat.field.message.placeholder,
                    )}
                    description={$locales.get(
                        (l) => l.ui.chat.field.message.description,
                    )}
                    bind:view={newMessageView}
                    bind:text={newMessage}
                />
                <Button
                    background
                    submit
                    active={chat !== undefined && newMessage.trim() !== ''}
                    tip={$locales.get((l) => l.ui.chat.button.submit.tip)}
                    action={submitMessage}>Send</Button
                >
            </div>
            <div class="formats"
                >/<em>{$locales.get((l) => l.token.Italic)}</em>/ *<strong
                    >{$locales.get((l) => l.token.Bold)}</strong
                >* ^<span style="font-weight: bolder"
                    >{$locales.get((l) => l.token.Extra)}</span
                >^ _&nbsp;<u>{$locales.get((l) => l.token.Underline)}</u>&nbsp;_
                \<code>{$locales.get((l) => l.token.Code)}</code>\ &lt;{$locales.get(
                    (l) => l.token.Link,
                )}@<Link to=".">https://...</Link>&gt;</div
            >
        </form>
    </section>
{/if}

<style>
    .chat {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

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
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: column;
    }

    .formats {
        color: var(--wordplay-header);
        font-size: calc(0.75 * var(--wordplay-small-font-size));
    }

    .new {
        display: flex;
        flex-direction: column;
        gap: calc(0.5 * var(--wordplay-spacing));
        padding: var(--wordplay-spacing);
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

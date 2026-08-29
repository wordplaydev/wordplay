<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import Loading from '@components/app/Loading.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import TileMessage from '@components/project/TileMessage.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import ReportMessage from './ReportMessage.svelte';
    import ResponsibilityNotice from '@components/moderation/ResponsibilityNotice.svelte';
    import {
        howToVisibility,
        projectVisibility,
    } from '@db/moderation/visibility';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import { type SerializedMessage } from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { Chats, Galleries, locales } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import type Project from '@db/projects/Project';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { localeGoto } from '@util/localeGoto';
    import { tick, untrack } from 'svelte';

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
                Chats.markChatRead(chat, $user.uid);
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
        Chats.deleteMessage(chat, message);
    }

    // user is a moderator of a chat if the chat is in a gallery and the user is a curator of that gallery
    let isModerator: boolean = $state(false);
    $effect(() => {
        isModerator =
            gallery !== undefined &&
            $user !== null &&
            $user !== undefined &&
            gallery.hasCurator($user.uid);
    });

    /** What this conversation is about, in the terms responsibility depends
     *  on: a chat inherits the visibility of its project or how-to. */
    const visibility = $derived(
        project
            ? projectVisibility(project, gallery)
            : howTo
              ? howToVisibility(howTo, gallery)
              : undefined,
    );

    function reportMessage(chat: Chat, message: SerializedMessage) {
        // The callable takes the reporter from the caller's own auth token;
        // passing a uid here would look authoritative and never be read.
        if (!chat || !$user) return;
        Chats.reportMessage(chat, message);
    }
</script>

{#snippet message(chat: Chat, msg: SerializedMessage)}
    {@const date = new Date(msg.time)}
    {@const state = chat.getMessageModeration(msg.id)}
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
            {#if $user?.uid === msg.creator && msg.text !== null && (state === undefined || state === 'approved')}
                <ConfirmButton
                    tip={(l: any) => l.ui.collaborate.button.delete}
                    prompt={(l: any) => l.ui.collaborate.button.confirmDelete}
                    action={() => deleteMessage(chat, msg)}
                    icon={CANCEL_SYMBOL}
                ></ConfirmButton>
            {/if}
        </div>
        <div
            class="what"
            style:border={isModerator && state === 'pending'
                ? 'solid var(--wordplay-border-width) var(--wordplay-warning)'
                : ''}
        >
            {#if msg.text === null}<em
                    ><LocalizedText
                        path={(l: any) => l.ui.collaborate.error.deleted}
                    /></em
                >
            {:else if state === 'pending'}
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
            {:else if state === 'removed'}
                <em>
                    <LocalizedText
                        path={(l) => l.ui.collaborate.moderation.removed}
                    />
                </em>
            {:else}
                <MarkupHTMLView markup={msg.text.replaceAll('\n', '\n\n')} />
            {/if}
        </div>
        {#if !($user?.uid === msg.creator) && galleryID && (state === undefined || state === 'approved')}
            <ReportMessage
                report={() => reportMessage(chat, msg)}
                {visibility}
                gallery={gallery ? gallery.getName($locales) : ''}
            />
        {:else if isModerator && state === 'pending'}
            <Button
                tip={(l) => l.ui.collaborate.moderation.moderate.tip}
                label={(l) => l.ui.collaborate.moderation.moderate.label}
                action={() => {
                    localeGoto('/galleries/moderation');
                }}
            />
        {/if}
    </div>
{/snippet}

<!-- Positioned, full-size wrapper so the Loading overlay scopes to this chat
     panel (a project tile / embedded how-to chat box) rather than the viewport. -->
<div class="view">
    {#if chat === null}
        <Loading></Loading>
    {:else if chat === false}
        <TileMessage error>
            <p><LocalizedText path={(l) => l.ui.collaborate.error.offline} /></p
            >
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
        <!-- Who reviews what's said here. Shown whatever the answer is,
             including "nobody": the old text only appeared when the project was
             in a gallery, so a chat with no reviewer said nothing at all and a
             creator had to infer it. -->
        {#if visibility}
            <ResponsibilityNotice
                {visibility}
                gallery={gallery ? gallery.getName($locales) : ''}
            />
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
            <div class="editor">
                <FormattedEditor
                    id="new-message"
                    placeholder={(l) =>
                        l.ui.collaborate.field.message.placeholder}
                    description={(l) =>
                        l.ui.collaborate.field.message.description}
                    bind:view={newMessageView}
                    bind:text={newMessage}
                />
            </div>
            <div class="send">
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
</div>

<style>
    /* Positioned, full-size column so the Loading overlay covers just this
       panel, and the chat's scroller/form lay out as before. Fills both a
       flex-column tile (.collab) and a height-based box (.how-to-chat). */
    .view {
        position: relative;
        flex: 1;
        min-height: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .scroller {
        overflow-y: auto;
        overflow-x: clip;
        flex: 1 1 0;
        min-height: 0;
        width: 100%;
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
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: auto;
        flex-shrink: 0;
        position: sticky;
        bottom: 0;
        background: var(--wordplay-background);
        padding-block-start: calc(0.5 * var(--wordplay-spacing));
        z-index: 1;
    }

    .editor,
    .send {
        grid-column: 1;
        grid-row: 1;
    }

    .send {
        align-self: end;
        justify-self: end;
        padding: calc(0.5 * var(--wordplay-spacing));
        z-index: 2;
    }

    .message {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        width: fit-content;
        max-width: 75%;
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
        width: 100%;
        overflow-wrap: anywhere;
    }
</style>

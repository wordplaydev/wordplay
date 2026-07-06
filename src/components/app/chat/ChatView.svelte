<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import Loading from '@components/app/Loading.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import { getUser } from '@components/project/Contexts';
    import TileMessage from '@components/project/TileMessage.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import Options from '@components/widgets/Options.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import { type SerializedMessage } from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { Chats, Galleries, locales } from '@db/Database';
    import { functions } from '@db/firebase';
    import {
        translateMarkupText,
        type RawTranslator,
    } from '@db/translateMarkup';
    import { getLanguageName } from '@locale/LanguageCode';
    import getTranslatableLocales from '@locale/getTranslatableLocales';
    import { localeToString, stringToLocale } from '@locale/Locale';
    import type Gallery from '@db/galleries/Gallery';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import type Project from '@db/projects/Project';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { localeGoto } from '@util/localeGoto';
    import { httpsCallable } from 'firebase/functions';
    import type {
        GetLLMTranslationsInputs,
        GetLLMTranslationsOutput,
    } from 'shared-types';
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

    // The languages a creator can tag a message with, one option per
    // translatable language (deduped, since translatable locales list a locale
    // per region and we only tag the language).
    const languageOptions = (() => {
        const seen = new Set<string>();
        const options: { value: string; label: string }[] = [];
        for (const locale of getTranslatableLocales()) {
            if (seen.has(locale.language)) continue;
            seen.add(locale.language);
            options.push({
                value: locale.language,
                label: getLanguageName(locale.language) ?? locale.language,
            });
        }
        return options;
    })();

    // The language the creator has chosen to tag their next message with,
    // defaulting to their current primary UI language.
    let messageLanguage = $state<string | undefined>(
        $locales.getLanguages()[0],
    );

    // Options for the "translate messages to" dropdown: an off entry plus every
    // translatable language.
    const translateOptions: { value: string | undefined; label: string }[] = [
        { value: undefined, label: '—' },
        ...languageOptions,
    ];

    // The language the viewer chose to translate received messages into, or
    // undefined for no translation.
    let translateTo = $state<string | undefined>(undefined);

    // Translations of visible messages into `translateTo`, keyed by message id.
    // Cleared when the target changes or translation is turned off.
    let translations = $state<
        Record<string, { language: string; text: string }>
    >({});

    // Whether a translation pass is currently running.
    let translating = $state(false);

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
        Chats.addMessage(chat, newMessage, messageLanguage);
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

    /** Translate every visible message into the chosen target language and show
     *  each translation beneath its original. Each message is translated from
     *  its own tagged language (falling back to the viewer's primary language
     *  when a message predates language tags) via translateMarkupText, which
     *  preserves embedded \code\ and is backed by the getLLMTranslations
     *  callable. */
    async function translateMessages(target: string | undefined) {
        translateTo = target;
        translations = {};
        if (target === undefined || !chat || !functions) return;
        const toLocale = stringToLocale(target);
        if (toLocale === undefined) return;

        translating = true;
        const messages = chat.getMessages();
        const call = httpsCallable<
            GetLLMTranslationsInputs,
            GetLLMTranslationsOutput
        >(functions, 'getLLMTranslations');
        const translate: RawTranslator = async (texts, from, to, context) =>
            (
                await call({
                    from: localeToString(from),
                    to: localeToString(to),
                    texts,
                    ...(context ? { projectContext: context } : {}),
                })
            ).data;

        const next: Record<string, { language: string; text: string }> = {};
        for (const msg of messages) {
            if (msg.text === null) continue;
            const source = msg.language ?? $locales.getLanguages()[0];
            const fromLocale = stringToLocale(source);
            if (fromLocale === undefined) continue;
            const result = await translateMarkupText(
                msg.text,
                fromLocale,
                toLocale,
                translate,
            );
            if (result !== null)
                next[msg.id] = { language: target, text: result };
        }
        translations = next;
        translating = false;
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
        Chats.reportMessage(chat, message, $user.uid);

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
            style:border={isModerator && msg.moderation === 'pending'
                ? 'solid var(--wordplay-border-width) var(--wordplay-warning)'
                : ''}
        >
            {#if msg.text === null}<em
                    ><LocalizedText
                        path={(l: any) => l.ui.collaborate.error.deleted}
                    /></em
                >
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
        {#if translations[msg.id]}
            <div class="translation">
                {#if msg.language}
                    <div class="lang-tag">{msg.language}</div>
                {/if}
                <hr class="divider" />
                <div class="what">
                    <MarkupHTMLView
                        markup={translations[msg.id].text.replaceAll(
                            '\n',
                            '\n\n',
                        )}
                    />
                </div>
                <div class="lang-tag">{translations[msg.id].language}</div>
            </div>
        {/if}
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
        {#if galleryID}
            <MarkupHTMLView
                markup={(l) => l.ui.collaborate.moderation.inGallery}
            />
        {/if}
        <div class="translate-bar">
            <span class="translate-label"
                ><LocalizedText
                    path={(l) => l.ui.collaborate.translate.label}
                /></span
            >
            <Options
                id="translate-messages-to"
                label={(l) => l.ui.collaborate.translate.label}
                value={translateTo}
                options={translateOptions}
                change={(value) => translateMessages(value)}
            />
            {#if translating}<Spinning />{/if}
        </div>
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
        <div class="language">
            <Options
                id="new-message-language"
                label={(l) => l.ui.collaborate.field.language}
                value={messageLanguage}
                options={languageOptions}
                change={(value) => (messageLanguage = value)}
            />
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

    .language {
        display: flex;
        justify-content: flex-end;
        flex-shrink: 0;
        padding-block: calc(0.5 * var(--wordplay-spacing));
    }

    .translate-bar {
        display: flex;
        align-items: center;
        gap: var(--wordplay-spacing);
        flex-shrink: 0;
        padding-block: calc(0.5 * var(--wordplay-spacing));
    }

    .translate-label {
        font-size: small;
    }

    .translation {
        display: flex;
        flex-direction: column;
    }

    .divider {
        border: none;
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        width: 100%;
        margin-block: calc(0.5 * var(--wordplay-spacing));
    }

    .lang-tag {
        font-size: x-small;
        opacity: 0.6;
        text-align: end;
        text-transform: uppercase;
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

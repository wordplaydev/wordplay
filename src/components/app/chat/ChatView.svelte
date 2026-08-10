<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import Loading from '@components/app/Loading.svelte';
    import Notice from '@components/app/Notice.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import LocaleName from '@components/settings/LocaleName.svelte';
    import LocaleSearch, { filterLocalesByQuery } from '@components/settings/LocaleSearch.svelte';
    import { getAnnouncer, getUser } from '@components/project/Contexts';
    import TileMessage from '@components/project/TileMessage.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import { type SerializedMessage } from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { Chats, Galleries, locales } from '@db/Database';
    import { getFunctionsInstance } from '@db/firebase';
    import getFirebaseTranslator from '@db/getFirebaseTranslator';
    import {
        translateMarkupTexts,
        type MarkupTranslationInput,
    } from '@db/translateMarkup';
    import { Languages } from '@locale/LanguageCode';
    import getTranslatableLocales from '@locale/getTranslatableLocales';
    import {
        localeToString,
        localesAreEqual,
        stringToLocale,
        type Locale,
    } from '@locale/Locale';
    import { getLocaleLanguages } from '@locale/LocaleText';
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
    const announce = getAnnouncer();
    let newMessage = $state('');
    let newMessageView = $state<HTMLTextAreaElement | undefined>();

    let scrollerView = $state<HTMLDivElement | undefined>();

    // Query strings for the two language search inputs; the more they enter, suggestions is added .
    let translateQuery = $state('');
    let messageLanguageQuery = $state('');

    // Keep each translatable locale distinct.
    
    const uniqueLanguageLocales = (() => {
        const seen = new Set<string>();
        const result: Locale[] = [];
        for (const locale of getTranslatableLocales()) {
            const key = localeToString(locale);
            if (seen.has(key)) continue;
            seen.add(key);
            result.push(locale);
        }
        return result;
    })();

    // Locale lists filtered by the corresponding search query.
    let translatableLocales = $derived(
        filterLocalesByQuery(
            uniqueLanguageLocales,
            translateQuery,
            (locale) => locale,
            $locales.getLanguages(),
        ),
    );
    let messageLanguageLocales = $derived(
        filterLocalesByQuery(
            uniqueLanguageLocales,
            messageLanguageQuery,
            (locale) => locale,
            $locales.getLanguages(),
        ),
    );

    function isSelectedLocale(value: string | undefined, locale: Locale) {
        if (value === undefined) return false;
        const selected = stringToLocale(value);
        return selected !== undefined && localesAreEqual(selected, locale);
    }

    // The language the creator has chosen to tag their next message with,
    // defaulting to their current primary UI language.
    let messageLanguage = $state<string | undefined>(
        $locales.getLanguages()[0],
    );

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

    // Whether the whole translation pass failed (shown below the translate
    // control), e.g. the translation service is unavailable.
    let translateError = $state(false);

    // Ids of messages whose individual translation failed (shown next to each
    // message), when only some batches error out.
    let messageErrors = $state<Record<string, boolean>>({});
    let lastAnnouncedTranslateError = false;
    let lastAnnouncedMessageErrors = '';

    $effect(() => {
        if (!announce || !$announce) return;
        if (translateError === lastAnnouncedTranslateError) return;
        lastAnnouncedTranslateError = translateError;
        if (translateError) {
            $announce(
                'chat-translation-error',
                $locales.getLanguages()[0],
                $locales.getMultilingualText(
                    (l) => l.ui.collaborate.translate.error,
                ),
            );
        }
    });

    $effect(() => {
        if (!announce || !$announce) return;
        const messageErrorIDs = Object.keys(messageErrors).sort().join(',');
        if (messageErrorIDs === lastAnnouncedMessageErrors) return;
        lastAnnouncedMessageErrors = messageErrorIDs;
        if (messageErrorIDs.length > 0) {
            $announce(
                'chat-message-errors',
                $locales.getLanguages()[0],
                $locales.getMultilingualText(
                    (l) => l.ui.collaborate.translate.messageError,
                ),
            );
        }
    });

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
     *  each translation beneath its original. Messages already carrying a cached
     *  translation for the target reuse it; the rest are handed to
     *  translateMarkupTexts, which groups them by source language and translates
     *  in batches, then their results are cached on the message for next time. */
    async function translateMessages(target: string | undefined) {
        translateTo = target;
        translations = {};
        translateError = false;
        messageErrors = {};
        if (target === undefined || !chat) return;
        const toLocale = stringToLocale(target);
        if (toLocale === undefined) return;

        const messages = chat.getMessages();

        // Translations to show, keyed by message id: cached ones filled in now,
        // freshly translated ones added after the batch pass.
        const next: Record<string, { language: string; text: string }> = {};

        // Messages that still need translating, grouped/batched by the helper.
        const toTranslate: MarkupTranslationInput[] = [];

        for (const msg of messages) {
            const isVisibleMessage =
                msg.text !== null &&
                (msg.moderation === undefined || msg.moderation === 'approved');
            if (!isVisibleMessage || msg.text === null) continue;

            // Reuse a cached translation for this target immediately
            const cached = msg.translations?.[target];
            if (cached !== undefined) {
                next[msg.id] = { language: target, text: cached };
                continue;
            }

            const source = msg.language ?? $locales.getLanguages()[0];
            const fromLocale = stringToLocale(source);
            if (fromLocale === undefined) continue;

            toTranslate.push({
                id: msg.id,
                text: msg.text,
                from: fromLocale,
            });
        }

        // Show cached results right away then aftere network call
        translations = next;

        if (toTranslate.length === 0) return;

        translating = true;
        try {
            // getFunctionsInstance() initialises the SDK on first call and
            // wires the emulator.
            const functionsInstance = await getFunctionsInstance();
            if (!functionsInstance) {
                translateError = true;
                return;
            }

            const translate = getFirebaseTranslator(functionsInstance);
            const { translated, failed } = await translateMarkupTexts(
                toTranslate,
                toLocale,
                translate,
            );

            // A newer target was chosen while this pass ran; discard our result.
            if (target !== translateTo) return;

            const failedIds: Record<string, boolean> = {};
            for (const id of failed) failedIds[id] = true;
            for (const [id, text] of translated)
                next[id] = { language: target, text };

            translations = next;
            messageErrors = failedIds;

            // Cache freshly translated messages in one batch so future requests
            // for this language reuse the stored text without issuing one
            // transaction per message.
            if (translated.size > 0) {
                try {
                    await Chats.saveMessageTranslations(chat, target, translated);
                } catch (error) {
                    // Rendering already has the translated text.
                    console.error(error);
                }
            }
        } catch (_) {
            // The network translation pass failed; cached entries remain shown.
            translateError = true;
        } finally {
            translating = false;
        }
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
    {@const isVisibleMessage =
        msg.text !== null &&
        (msg.moderation === undefined || msg.moderation === 'approved')}
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
            {#if $user?.uid === msg.creator && isVisibleMessage}
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
        {#if translations[msg.id] && isVisibleMessage}
            <div class="translation">
                <hr class="divider" />
                <div class="what">
                    <MarkupHTMLView
                        markup={translations[msg.id].text.replaceAll(
                            '\n',
                            '\n\n',
                        )}
                    />
                </div>
                <div class="lang-tag">
                    {#if msg.language}{$locales.concretize(
                            (l) => l.ui.collaborate.translate.direction,
                            {
                                from: getLocaleLanguages(msg.language)
                                    .map((c) => Languages[c]?.name ?? c)
                                    .join(' + '),
                                to: getLocaleLanguages(
                                    translations[msg.id].language,
                                )
                                    .map((c) => Languages[c]?.name ?? c)
                                    .join(' + '),
                            },
                        ).toText()}{:else}<LocaleName
                        locale={translations[msg.id].language}
                    />{/if}
                </div>
            </div>
        {/if}
        {#if messageErrors[msg.id]}
            <Notice text={(l) => l.ui.collaborate.translate.messageError} />
        {/if}
        {#if !($user?.uid === msg.creator) && galleryID && isVisibleMessage}
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
            {#if translating}<Spinning />{/if}
            {#if translateTo !== undefined}
                <Button
                    tip={(l) => l.ui.collaborate.translate.off}
                    action={() => translateMessages(undefined)}
                    ><LocalizedText
                        path={(l) => l.ui.collaborate.translate.off}
                    /></Button
                >
            {/if}
            <LocaleSearch id="translate-messages-search" bind:query={translateQuery} />
        </div>
        {#if translateQuery.trim() !== ''}
            <div class="locale-options">
                {#each translatableLocales as locale}
                    {@const ls = localeToString(locale)}
                    <div class="option" class:selected={isSelectedLocale(translateTo, locale)}>
                        <Button
                            action={() => translateMessages(ls)}
                            active={!isSelectedLocale(translateTo, locale)}
                            tip={(l) => l.ui.project.button.destination}
                        ><LocaleName locale={ls} supported showDraft={false} /></Button>
                    </div>
                {:else}&mdash;
                {/each}
            </div>
        {/if}
        {#if translateError}
            <Notice text={(l) => l.ui.collaborate.translate.error} />
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
        <div class="language">
            <LocaleSearch id="new-message-language-search" bind:query={messageLanguageQuery} />
            {#if messageLanguageQuery.trim() !== ''}
                <div class="locale-options">
                    {#each messageLanguageLocales as locale}
                        {@const ls = localeToString(locale)}
                        <div class="option" class:selected={isSelectedLocale(messageLanguage, locale)}>
                            <Button
                                action={() => { messageLanguage = ls; }}
                                active={!isSelectedLocale(messageLanguage, locale)}
                                tip={(l) => l.ui.collaborate.translate.language}
                            ><LocaleName locale={ls} supported showDraft={false} /></Button>
                        </div>
                    {:else}&mdash;
                    {/each}
                </div>
            {/if}
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

    .locale-options {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
        row-gap: var(--wordplay-spacing);
        padding-block: var(--wordplay-spacing);
        max-height: 8rem;
        overflow-y: auto;
        flex-shrink: 0;
    }

    .option {
        border: var(--wordplay-focus-width) solid transparent;
        border-radius: var(--wordplay-border-radius);
    }

    .option.selected {
        border-color: var(--wordplay-focus-color);
    }
</style>

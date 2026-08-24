<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import Loading from '@components/app/Loading.svelte';
    import Notice from '@components/app/Notice.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import LocaleName from '@components/settings/LocaleName.svelte';
    import LocaleSearch, {
        filterLocalesByQuery,
    } from '@components/settings/LocaleSearch.svelte';
    import Options from '@components/widgets/Options.svelte';
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
    import getTranslatableLocales from '@locale/getTranslatableLocales';
    import { getLanguageDirection } from '@locale/LanguageCode';
    import {
        localeToString,
        localesAreEqual,
        stringToLocale,
        type Locale,
    } from '@locale/Locale';
    import { getMultilingualLanguageLabel } from '@locale/LocaleText';
    import type Gallery from '@db/galleries/Gallery';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import type Project from '@db/projects/Project';
    import { CANCEL_SYMBOL, SEARCH_SYMBOL } from '@parser/Symbols';
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

    // getTranslatableLocales() is built from Object.entries(Languages), which
    // has unique keys, so no additional dedupe is needed here.
    const translatableLocales = getTranslatableLocales();

    // The languages actually relevant to this chat: the viewer's own locale first
    // (so the message-language default below always has a matching option, even
    // for a locale like ta-IN-LK-SG that TranslatableLocales only lists as separate
    // single-region entries), then the chat's declared language, then every
    // language a message in the chat is already tagged with. This keeps both
    // pickers below to a handful of options instead of every translatable locale
    // (~250 languages, ~650 language+region combinations) with no way to filter.
    let chatLocales = $derived.by(() => {
        const seen = new Set<string>();
        const found: Locale[] = [];
        const add = (localeString: string | undefined) => {
            if (localeString === undefined || seen.has(localeString)) return;
            const locale = stringToLocale(localeString);
            if (locale === undefined) return;
            seen.add(localeString);
            found.push(locale);
        };
        add(localeToString($locales.getLocale()));
        if (chat) {
            add(chat.getLanguage());
            for (const msg of chat.getMessages()) add(msg.language);
        }
        return found;
    });

    /** Whether the "more languages" search is showing for the translate-to and
     *  message-language pickers, and the query typed into each. Collapsed by
     *  default so the two pickers don't permanently cost extra width for a list
     *  almost nobody needs to search. */
    let translateSearchExpanded = $state(false);
    let translateQuery = $state('');
    let messageSearchExpanded = $state(false);
    let messageQuery = $state('');

    /** The options shown in a language picker: the chat's own short list of
     *  languages normally, or every translatable locale filtered by the search
     *  query once the picker's search is expanded. */
    function languagePickerLocales(expanded: boolean, query: string): Locale[] {
        return expanded
            ? filterLocalesByQuery(
                  translatableLocales,
                  query,
                  (locale) => locale,
                  $locales.getLanguages(),
              )
            : chatLocales;
    }

    // The language the creator has chosen to tag their next message with.
    // Defaults to the viewer's current UI locale (matching startChat) so
    // the send button is usable immediately; the picker lets them override it.
    // It also change after
    let messageLanguageOverride = $state<string | undefined>(undefined);
    let messageLanguage = $derived(
        messageLanguageOverride ?? localeToString($locales.getLocale()),
    );
    // The language the viewer chose to translate received messages into, or
    // undefined for no translation.
    let translateTo = $state<string | undefined>(undefined);

    // Translations of visible messages into `translateTo`, keyed by message id.
    // Cleared when the target changes or translation is turned off.
    let translations = $state<
        Record<string, { language: string; text: string }>
    >({});

    // Translations delivered exclusively by the Firestore sidecar subscription.
    // Kept separate so translateMessages can read them without ever clobbering them
    let sidecarTranslations = $state<
        Record<string, { language: string; text: string }>
    >({});

    // Whether a translation pass is currently running.
    let translating = $state(false);
    let translateRequest = 0;
    let lastTranslationContentKey = '';
    let translatePassTimeout: ReturnType<typeof setTimeout> | undefined;

    // Whether the whole translation pass failed (shown below the translate
    // control), e.g. the translation service is unavailable.
    let translateError = $state(false);

    // Ids of messages whose individual translation failed (shown next to each
    // message), when only some batches error out.
    let messageErrors = $state<Record<string, boolean>>({});

    let lastAnnouncedTranslateError = false;
    let lastAnnouncedMessageErrors = '';
    let lastAnnouncedTranslation = '';

    $effect(() => {
        if (!announce || !$announce) return;
        if (translateError === lastAnnouncedTranslateError) return;
        lastAnnouncedTranslateError = translateError;
        if (translateError && translateTo !== undefined) {
            const toLang = getMultilingualLanguageLabel(translateTo);
            $announce(
                'banner',
                $locales.getLanguages()[0],
                $locales
                    .concretize((l) => l.ui.collaborate.translate.error, {
                        to: toLang,
                    })
                    .toText(),
            );
        }
    });

    $effect(() => {
        if (!announce || !$announce) return;
        const messageErrorIDs = Object.keys(messageErrors).sort().join(',');
        if (messageErrorIDs === lastAnnouncedMessageErrors) return;
        lastAnnouncedMessageErrors = messageErrorIDs;
        if (messageErrorIDs.length > 0) {
            const ids = Object.keys(messageErrors);
            const count = ids.length;
            let text: string;
            if (count === 1 && chat) {
                const msg = chat.getMessages().find((m) => m.id === ids[0]);
                const sender =
                    (msg ? creators[msg.creator] : undefined)?.getUsername(
                        false,
                    ) ?? '—';
                text = $locales
                    .concretize(
                        (l) => l.ui.collaborate.translate.messageError,
                        { sender },
                    )
                    .toText();
            } else {
                text = $locales
                    .concretize(
                        (l) => l.ui.collaborate.translate.messageErrors,
                        { count },
                    )
                    .toText();
            }
            $announce('banner', $locales.getLanguages()[0], text);
        }
    });

    // Announce a finished translation pass. Without this, picking a language
    // that succeeds — the common case — is silent: the messages change
    // visually, but nothing is said. Keyed on target + count so it re-fires
    // whenever either changes (a new language chosen, or another message
    // translated), and stays silent on repeats of the same settled state.
    $effect(() => {
        if (!announce || !$announce) return;
        if (translating || translateTo === undefined || translateError) return;
        const count = Object.keys(translations).length;
        if (count === 0) return;
        const key = `${translateTo}:${count}`;
        if (key === lastAnnouncedTranslation) return;
        lastAnnouncedTranslation = key;
        const toLang = getMultilingualLanguageLabel(translateTo);
        $announce(
            'translation',
            $locales.getLanguages()[0],
            $locales
                .concretize((l) => l.ui.collaborate.translate.translated, {
                    count,
                    language: toLang,
                })
                .toText(),
        );
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
        const language = localeToString($locales.getLocale());
        if (project) Chats.addChat(project, gallery, language);
        else if (howTo) Chats.addChatToHowTo(howTo, gallery, language);
    }

    // Discrete UI actions (dropdown choice, "Stop translating") set the target
    // immediately
    function setTranslateTarget(target: string | undefined) {
        translateTo = target;
    }

    /** Translate every visible message into the chosen target language and show
     *  each translation beneath its original. Messages already carrying a cached
     *  translation for the target reuse it; the rest are handed to
     *  translateMarkupTexts, which groups them by source language and translates
     *  in batches, then their results are cached in the sidecar for next time.
     *  Always called from the content-key $effect — never directly — so
     *  translateTo is already set and must not be re-assigned here. */
    async function translateMessages() {
        const target = translateTo; // capture; may change while async runs
        const request = ++translateRequest;
        translateError = false;
        messageErrors = {};
        if (target === undefined || !chat) {
            translating = false;
            return;
        }
        const toLocale = stringToLocale(target);
        if (toLocale === undefined) {
            translating = false;
            return;
        }

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

            // A creator already understands what they wrote — never translate
            // (or pay to translate) the viewer's own messages. This is also
            // what the rights page promises: only *other* participants'
            // messages are ever sent to the translation service.
            if ($user && msg.creator === $user.uid) continue;

            // Reuse a sidecar-delivered cached translation immediately.
            const cached = sidecarTranslations[msg.id]?.text;
            if (cached !== undefined) {
                next[msg.id] = { language: target, text: cached };
                continue;
            }

            // Fall back to the chat's language (set at creation), then the
            // viewer's locale as a last resort. This avoids wrongly declaring
            // every untagged pre-existing message as being in the viewer's
            // language, which would fire redundant translation batches and
            // produce incorrect translations for non-viewer-language chats.
            const source =
                msg.language ??
                chat.getLanguage() ??
                localeToString($locales.getLocale());
            const fromLocale = stringToLocale(source);
            if (fromLocale === undefined) continue;
            if (localesAreEqual(fromLocale, toLocale)) continue;

            toTranslate.push({
                id: msg.id,
                text: msg.text,
                from: fromLocale,
            });
        }

        // Show cached results right away; sidecar entries fill any gaps not
        // yet present in next.
        translations = { ...sidecarTranslations, ...next };

        if (toTranslate.length === 0) {
            translating = false;
            return;
        }

        translating = true;
        try {
            // getFunctionsInstance() initialises the SDK on first call and
            // wires the emulator.
            const functionsInstance = await getFunctionsInstance();
            if (!functionsInstance) {
                if (request !== translateRequest) return;
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
            if (request !== translateRequest) return;

            const failedIds: Record<string, boolean> = {};
            for (const id of failed) failedIds[id] = true;
            for (const [id, text] of translated)
                next[id] = { language: target, text };

            translations = { ...sidecarTranslations, ...next };
            messageErrors = failedIds;

            // Cache freshly translated messages in one batch so future requests
            // for this language reuse the stored text without issuing one
            // transaction per message.
            if (translated.size > 0) {
                try {
                    await Chats.saveMessageTranslations(
                        chat,
                        target,
                        translated,
                    );
                } catch (error) {
                    // Rendering already has the translated text.
                    console.error(error);
                }
            }
        } catch (_) {
            if (request !== translateRequest) return;
            // The network translation pass failed; cached entries remain shown.
            translateError = true;
        } finally {
            if (request === translateRequest) translating = false;
        }
    }

    // Subscribe to the per-chat, per-language translation sidecar when a
    // target is active.  When another viewer translates the same language
    // first, their result arrives here via the snapshot, preventing a
    // duplicate LLM call.  The subscription is torn down and rebuilt whenever
    // the target language changes or translation is turned off.
    //
    // Results are written into sidecarTranslations — never into translations
    // directly — so that translateMessages can read them without clobbering
    // them on the next pass.
    $effect(() => {
        if (!chat || translateTo === undefined) return;
        const currentChat = chat;
        const target = translateTo;
        // Clear stale entries from the previous target language.
        sidecarTranslations = {};
        const unsub = Chats.subscribeChatTranslations(
            currentChat.getProjectID(),
            target,
            (entries) => {
                if (target !== translateTo) return;
                // A viewer's own messages are never translated going forward
                // (see the matching skip in translateMessages), but a sidecar
                // written before that existed may still carry one — filter it
                // out here so it can never be displayed.
                const ownMessageIDs = new Set(
                    $user
                        ? currentChat
                              .getMessages()
                              .filter((m) => m.creator === $user.uid)
                              .map((m) => m.id)
                        : [],
                );
                sidecarTranslations = {
                    ...sidecarTranslations,
                    ...Object.fromEntries(
                        Object.entries(entries)
                            .filter(([id]) => !ownMessageIDs.has(id))
                            .map(([id, text]) => [
                                id,
                                { language: target, text },
                            ]),
                    ),
                };
            },
        );
        return unsub;
    });

    // Keep translation mode live: when message content changes (including newly
    // arrived messages), refresh translations for the active target.
    $effect(() => {
        // Any change (new target, turned off, or new content) cancels a pass
        // that hasn't fired yet.
        if (translatePassTimeout !== undefined) {
            clearTimeout(translatePassTimeout);
            translatePassTimeout = undefined;
        }

        if (!chat || translateTo === undefined) {
            lastTranslationContentKey = '';
            if (translateTo === undefined) {
                // Turning off is instant: discard any in-flight pass's result
                // (bump the request) and clear the visible state now.
                translateRequest++;
                translating = false;
                translations = {};
                sidecarTranslations = {};
                translateError = false;
                messageErrors = {};
                lastAnnouncedTranslation = '';
            }
            return;
        }

        const contentKey = [
            chat.getProjectID(),
            translateTo,
            ...chat
                .getMessages()
                .map((msg) =>
                    [
                        msg.id,
                        msg.text ?? '',
                        msg.moderation ?? '',
                        msg.language ?? '',
                    ].join(':'),
                ),
        ].join('|');

        if (contentKey === lastTranslationContentKey) return;
        lastTranslationContentKey = contentKey;

        // Debounce the pass itself: rapid content changes (messages streaming in)
        // coalesce into one translation pass 300ms after things settle. translateTo
        // was already set instantly above — only the network work waits.
        translatePassTimeout = setTimeout(() => {
            translatePassTimeout = undefined;
            untrack(() => {
                void translateMessages();
            });
        }, 300);

        return () => {
            if (translatePassTimeout !== undefined) {
                clearTimeout(translatePassTimeout);
                translatePassTimeout = undefined;
            }
        };
    });

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
            {@const translatedLocale = stringToLocale(
                translations[msg.id].language,
            )}
            <div
                class="translation"
                lang={translatedLocale?.language}
                dir={translatedLocale
                    ? getLanguageDirection(translatedLocale.language)
                    : undefined}
            >
                <hr class="divider" />
                <div class="what">
                    <MarkupHTMLView
                        markup={translations[msg.id].text.replaceAll(
                            '\n',
                            '\n\n',
                        )}
                        lang={translatedLocale?.language}
                        dir={translatedLocale
                            ? getLanguageDirection(translatedLocale.language)
                            : undefined}
                    />
                </div>
                <div class="lang-tag">
                    {#if msg.language}
                        <MarkupHTMLView
                            inline
                            markup={[
                                (l) => l.ui.collaborate.translate.direction,
                                {
                                    from: getMultilingualLanguageLabel(
                                        msg.language,
                                    ),
                                    to: getMultilingualLanguageLabel(
                                        translations[msg.id].language,
                                    ),
                                },
                            ]}
                        />
                    {:else}
                        <LocaleName locale={translations[msg.id].language} />
                    {/if}
                </div>
            </div>
        {/if}
        {#if messageErrors[msg.id]}
            <Notice>
                <MarkupHTMLView
                    markup={[
                        (l) => l.ui.collaborate.translate.messageError,
                        {
                            sender:
                                creators[msg.creator]?.getUsername(false) ??
                                '—',
                        },
                    ]}
                />
            </Notice>
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
            <label class="translate-label" for="translate-messages"
                ><LocalizedText
                    path={(l) => l.ui.collaborate.translate.label}
                /></label
            >
            {#if translating}<Spinning
                    label={(l) => l.ui.collaborate.translate.translating}
                />{/if}
            {#if translateTo !== undefined}
                <Button
                    tip={(l) => l.ui.collaborate.translate.off}
                    action={() => setTranslateTarget(undefined)}
                    ><LocalizedText
                        path={(l) => l.ui.collaborate.translate.off}
                    /></Button
                >
            {/if}
            <Options
                id="translate-messages"
                value={translateTo}
                label={(l) => l.ui.collaborate.translate.label}
                options={[
                    {
                        value: undefined,
                        label: (l) =>
                            l.ui.collaborate.translate.choosePlaceholder,
                    },
                    ...languagePickerLocales(
                        translateSearchExpanded,
                        translateQuery,
                    ).map((locale) => ({
                        value: localeToString(locale),
                        label: getMultilingualLanguageLabel(locale),
                    })),
                ]}
                change={(ls) => setTranslateTarget(ls)}
            />
            <Button
                tip={translateSearchExpanded
                    ? (l) => l.ui.collaborate.translate.fewerLanguages
                    : (l) => l.ui.collaborate.translate.moreLanguages}
                action={() =>
                    (translateSearchExpanded = !translateSearchExpanded)}
                expanded={translateSearchExpanded}
                controls="translate-language-search"
                icon={SEARCH_SYMBOL}
            />
            {#if translateSearchExpanded}
                <LocaleSearch
                    id="translate-language-search"
                    bind:query={translateQuery}
                />
            {/if}
        </div>
        {#if translateError}
            <Notice>
                <MarkupHTMLView
                    markup={[
                        (l) => l.ui.collaborate.translate.error,
                        {
                            to:
                                translateTo !== undefined
                                    ? getMultilingualLanguageLabel(translateTo)
                                    : '—',
                        },
                    ]}
                />
            </Notice>
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
            <label class="language-label" for="new-message-language"
                ><LocalizedText
                    path={(l) =>
                        l.ui.collaborate.translate.messageLanguageLabel}
                /></label
            >
            <Options
                id="new-message-language"
                value={messageLanguage}
                label={(l) => l.ui.collaborate.translate.messageLanguageLabel}
                options={[
                    {
                        value: undefined,
                        label: (l) =>
                            l.ui.collaborate.translate
                                .currentLanguagePlaceholder,
                    },
                    ...languagePickerLocales(
                        messageSearchExpanded,
                        messageQuery,
                    ).map((locale) => ({
                        value: localeToString(locale),
                        label: getMultilingualLanguageLabel(locale),
                    })),
                ]}
                change={(ls) => (messageLanguageOverride = ls)}
            />
            <Button
                tip={messageSearchExpanded
                    ? (l) => l.ui.collaborate.translate.fewerLanguages
                    : (l) => l.ui.collaborate.translate.moreLanguages}
                action={() => (messageSearchExpanded = !messageSearchExpanded)}
                expanded={messageSearchExpanded}
                controls="message-language-search"
                icon={SEARCH_SYMBOL}
            />
            {#if messageSearchExpanded}
                <LocaleSearch
                    id="message-language-search"
                    bind:query={messageQuery}
                />
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
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing-half);
        flex-shrink: 0;
        padding-block: calc(0.5 * var(--wordplay-spacing));
    }

    .translate-bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        flex-shrink: 0;
        padding-block: calc(0.5 * var(--wordplay-spacing));
    }

    .translate-label,
    .language-label {
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
</style>

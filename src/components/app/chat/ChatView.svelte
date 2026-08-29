<script module lang="ts">
    /** Element ids have to be unique in a document, and a page can hold more
     *  than one chat. The pattern MarkupHTMLView uses. */
    let idCounter = 0;
</script>

<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import LocaleSearch, {
        filterLocalesByQuery,
    } from '@components/settings/LocaleSearch.svelte';
    import Options from '@components/widgets/Options.svelte';
    import TranslationMeter from '@components/app/TranslationMeter.svelte';
    import { getAnnouncer } from '@components/project/Contexts';
    import { getFunctionsInstance } from '@db/firebase';
    import getPreferredTranslator from '@db/getPreferredTranslator';
    import type { TranslationBackend } from '@db/chooseTranslator';
    import {
        translateMarkupTexts,
        type MarkupTranslationInput,
    } from '@db/translateMarkup';
    import getTranslatableLocales from '@locale/getTranslatableLocales';
    import { getLanguageDirection } from '@locale/LanguageCode';
    import {
        localesAreEqual,
        localeToString,
        stringToLocale,
        type default as Locale,
    } from '@locale/Locale';
    import { getMultilingualLanguageLabel } from '@locale/LocaleText';
    import { SEARCH_SYMBOL } from '@parser/Symbols';
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
    const announce = getAnnouncer();

    /** Unique per instance, since a page can hold more than one chat. */
    const ids = `chat-${idCounter++}`;

    const translatableLocales = getTranslatableLocales();

    /** The languages this conversation is actually in: the viewer's own first
     *  (so the compose picker always has an option matching its default, even
     *  for a locale like ta-IN-LK-SG that the translatable list only carries as
     *  separate single-region entries), then the chat's own, then every
     *  language a message is tagged with. Keeps both pickers to a handful of
     *  options rather than ~650 with no way to filter. */
    let chatLocales = $derived.by(() => {
        const seen = new Set<string>();
        const found: Locale[] = [];
        const add = (tag: string | undefined) => {
            if (tag === undefined || seen.has(tag)) return;
            const locale = stringToLocale(tag);
            if (locale === undefined) return;
            seen.add(tag);
            found.push(locale);
        };
        add(localeToString($locales.getLocale()));
        if (chat) {
            add(chat.getLanguage());
            for (const msg of chat.getMessages()) add(msg.language);
        }
        return found;
    });

    /** Whether each picker's search is open, and what is typed in it. Closed by
     *  default so neither permanently costs width for a list almost nobody
     *  needs to search. */
    let translateSearchExpanded = $state(false);
    let translateQuery = $state('');
    let messageSearchExpanded = $state(false);
    let messageQuery = $state('');

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

    /** What language the next message is written in. Defaults to the viewer's
     *  own locale; the picker overrides it, for someone who reads Wordplay in
     *  one language and is writing in another. */
    let messageLanguageOverride = $state<string | undefined>(undefined);
    let messageLanguage = $derived(
        messageLanguageOverride ?? localeToString($locales.getLocale()),
    );

    /** What language to read the conversation in, or undefined for none. */
    let translateTo = $state<string | undefined>(undefined);

    /** What to show under each message, keyed by message id. */
    let translations = $state<
        Record<string, { language: string; text: string }>
    >({});
    /** What the cache has delivered, kept apart so a pass can read it without
     *  overwriting it. */
    let cachedTranslations = $state<
        Record<string, { language: string; text: string }>
    >({});

    let translating = $state(false);
    let translateRequest = 0;
    let lastTranslationContentKey = '';
    let translatePassTimeout: ReturnType<typeof setTimeout> | undefined;

    /** Whether the whole pass failed, and which individual messages did. */
    let translateError = $state(false);
    let messageErrors = $state<Record<string, boolean>>({});

    /** Whether every batch of the last pass was translated by the browser
     *  itself. Only then is it true that nothing was sent to us — a
     *  conversation in three languages can be partly on-device and partly
     *  ours. */
    let translatedOnDevice = $state(false);
    /** How much of the browser's translator has downloaded, while it is. */
    let downloading = $state<number | undefined>(undefined);

    let lastAnnouncedTranslateError = false;
    let lastAnnouncedMessageErrors = '';
    let lastAnnouncedTranslation = '';

    $effect(() => {
        if (!announce || !$announce) return;
        if (translateError === lastAnnouncedTranslateError) return;
        lastAnnouncedTranslateError = translateError;
        if (translateError && translateTo !== undefined)
            $announce(
                'banner',
                $locales.getLanguages()[0],
                $locales
                    .concretize((l) => l.ui.collaborate.translate.error, {
                        to: getMultilingualLanguageLabel(translateTo),
                    })
                    .toText(),
            );
    });

    $effect(() => {
        if (!announce || !$announce) return;
        const failed = Object.keys(messageErrors).sort().join(',');
        if (failed === lastAnnouncedMessageErrors) return;
        lastAnnouncedMessageErrors = failed;
        if (failed.length === 0) return;
        // Counted rather than named, even at one. The inline notice sits under
        // the message it is about, so a name there is noise — and a spoken
        // sentence is the last place to put someone's username.
        $announce(
            'banner',
            $locales.getLanguages()[0],
            $locales
                .concretize((l) => l.ui.collaborate.translate.messageErrors, {
                    count: Object.keys(messageErrors).length,
                })
                .toText(),
        );
    });

    /** Say when a pass finishes. Without this, choosing a language that works —
     *  the common case — is silent: the messages change on screen and nothing is
     *  said, which is indistinguishable from a broken feature. Keyed on target
     *  and count so it speaks again when either changes and stays quiet on a
     *  repeat of the same settled state. */
    $effect(() => {
        if (!announce || !$announce) return;
        if (translating || translateTo === undefined || translateError) return;
        const count = Object.keys(translations).length;
        if (count === 0) return;
        const key = `${translateTo}:${count}`;
        if (key === lastAnnouncedTranslation) return;
        lastAnnouncedTranslation = key;
        $announce(
            'translation',
            $locales.getLanguages()[0],
            $locales
                .concretize((l) => l.ui.collaborate.translate.translated, {
                    count,
                    language: getMultilingualLanguageLabel(translateTo),
                })
                .toText(),
        );
    });

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
        // The conversation's own language, which is the source for any message
        // written before per-message tagging, or by someone who never touched
        // the picker.
        const language = localeToString($locales.getLocale());
        if (project) Chats.addChat(project, gallery, language);
        else if (howTo) Chats.addChatToHowTo(howTo, gallery, language);
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

    /**
     * Show every message someone else wrote in the chosen language.
     *
     * A message already cached for this language is shown straight away; the
     * rest go to `translateMarkupTexts`, which groups them by the language they
     * were written in and translates each group in one call — which is also
     * what lets a backend be chosen per language pair. What comes back is
     * cached so the next person in the conversation pays nothing.
     *
     * Always called from the content-key effect, never directly, so the target
     * is already set and must not be reassigned here.
     */
    async function translateMessages() {
        const target = translateTo; // captured; may change while this runs
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

        const currentChat = chat;
        const next: Record<string, { language: string; text: string }> = {};
        const toTranslate: MarkupTranslationInput[] = [];

        for (const msg of currentChat.getMessages()) {
            const state = currentChat.getMessageModeration(msg.id);
            if (
                msg.text === null ||
                (state !== undefined && state !== 'approved')
            )
                continue;

            // A creator already knows what they wrote, so their own messages
            // are never translated — nor paid for, nor sent anywhere. This is
            // also exactly what the rights page promises.
            if ($user && msg.creator === $user.uid) continue;

            const cached = cachedTranslations[msg.id]?.text;
            if (cached !== undefined) {
                next[msg.id] = { language: target, text: cached };
                continue;
            }

            // The message's own tag, then the conversation's. Falling back to
            // the viewer's locale would declare every untagged message to be in
            // the language they are translating *into*, which either skips it
            // or translates it from the wrong language.
            const source = msg.language ?? currentChat.getLanguage();
            const fromLocale =
                source === undefined ? undefined : stringToLocale(source);
            if (fromLocale === undefined) continue;
            if (localesAreEqual(fromLocale, toLocale)) continue;

            toTranslate.push({ id: msg.id, text: msg.text, from: fromLocale });
        }

        // Cached results appear immediately, before any network work.
        translations = { ...cachedTranslations, ...next };

        if (toTranslate.length === 0) {
            translating = false;
            return;
        }

        translating = true;
        const backends = new Set<TranslationBackend>();
        try {
            const functions = await getFunctionsInstance();
            if (!functions) {
                if (request !== translateRequest) return;
                translateError = true;
                return;
            }

            const { translated, failed } = await translateMarkupTexts(
                toTranslate,
                toLocale,
                getPreferredTranslator(functions, {
                    onBackend: (backend) => backends.add(backend),
                    download: (loaded) => {
                        if (request === translateRequest)
                            downloading = loaded < 1 ? loaded : undefined;
                    },
                }),
            );

            // A newer target was chosen while this ran; throw the result away.
            if (request !== translateRequest) return;

            const failedIDs: Record<string, boolean> = {};
            for (const id of failed) failedIDs[id] = true;
            for (const [id, text] of translated)
                next[id] = { language: target, text };

            translations = { ...cachedTranslations, ...next };
            messageErrors = failedIDs;
            translatedOnDevice = backends.size === 1 && backends.has('device');

            // Cache what we just bought, so nobody else in the conversation
            // buys it again. Only what our own servers translated: an
            // on-device translation cost nothing and never left the machine,
            // and uploading it would undo exactly that.
            if (translated.size > 0 && !translatedOnDevice)
                try {
                    await Chats.saveMessageTranslations(
                        currentChat,
                        target,
                        translated,
                        Object.fromEntries(
                            Object.entries(cachedTranslations).map(
                                ([id, entry]) => [id, entry.text],
                            ),
                        ),
                    );
                } catch (error) {
                    // The translations are already on screen; failing to cache
                    // them costs the next viewer a re-translation and nothing
                    // else.
                    console.error(error);
                }
        } catch (error) {
            if (request !== translateRequest) return;
            console.error(error);
            translateError = true;
        } finally {
            if (request === translateRequest) {
                translating = false;
                downloading = undefined;
            }
        }
    }

    /** Watch the chosen language's cache. When someone else in the
     *  conversation translates it first, their result arrives here and nobody
     *  pays twice. Written into its own state rather than into `translations`,
     *  so a pass can read it without overwriting it. */
    $effect(() => {
        if (!chat || translateTo === undefined) return;
        const currentChat = chat;
        const target = translateTo;
        cachedTranslations = {};
        return Chats.subscribeChatTranslations(
            currentChat.getProjectID(),
            target,
            (entries) => {
                if (target !== translateTo) return;
                // A viewer's own messages are never translated now, but a cache
                // written before that was true may still carry one.
                const own = new Set(
                    $user
                        ? currentChat
                              .getMessages()
                              .filter((m) => m.creator === $user.uid)
                              .map((m) => m.id)
                        : [],
                );
                cachedTranslations = Object.fromEntries(
                    Object.entries(entries)
                        .filter(([id]) => !own.has(id))
                        .map(([id, text]) => [id, { language: target, text }]),
                );
            },
        );
    });

    /** Keep translations live as messages arrive. */
    $effect(() => {
        if (translatePassTimeout !== undefined) {
            clearTimeout(translatePassTimeout);
            translatePassTimeout = undefined;
        }

        if (!chat || translateTo === undefined) {
            lastTranslationContentKey = '';
            if (translateTo === undefined) {
                // Turning it off is instant: discard whatever is in flight and
                // clear the screen now.
                translateRequest++;
                translating = false;
                translations = {};
                cachedTranslations = {};
                translateError = false;
                messageErrors = {};
                translatedOnDevice = false;
                downloading = undefined;
                lastAnnouncedTranslation = '';
            }
            return;
        }

        const currentChat = chat;
        const contentKey = [
            currentChat.getProjectID(),
            translateTo,
            ...currentChat
                .getMessages()
                .map((msg) =>
                    [
                        msg.id,
                        msg.text ?? '',
                        currentChat.getMessageModeration(msg.id) ?? '',
                        msg.language ?? '',
                    ].join(':'),
                ),
        ].join('|');

        if (contentKey === lastTranslationContentKey) return;
        lastTranslationContentKey = contentKey;

        // The pass is debounced, not the choice: messages streaming in coalesce
        // into one pass once things settle, while choosing a language and
        // stopping both take effect at once.
        translatePassTimeout = setTimeout(() => {
            translatePassTimeout = undefined;
            untrack(() => void translateMessages());
        }, 300);

        return () => {
            if (translatePassTimeout !== undefined) {
                clearTimeout(translatePassTimeout);
                translatePassTimeout = undefined;
            }
        };
    });
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
        {#if translations[msg.id] && msg.text !== null && (state === undefined || state === 'approved')}
            {@const into = stringToLocale(translations[msg.id].language)}
            {@const from = msg.language
                ? stringToLocale(msg.language)
                : undefined}
            <div
                class="translation"
                lang={into?.language}
                dir={into ? getLanguageDirection(into.language) : undefined}
            >
                <div class="what">
                    <MarkupHTMLView
                        markup={translations[msg.id].text.replaceAll(
                            '\n',
                            '\n\n',
                        )}
                        lang={into?.language}
                        dir={into
                            ? getLanguageDirection(into.language)
                            : undefined}
                    />
                </div>
                <div class="lang-tag">
                    {#if from}
                        <MarkupHTMLView
                            inline
                            markup={[
                                (l) => l.ui.collaborate.translate.direction,
                                {
                                    from: getMultilingualLanguageLabel(from),
                                    to: getMultilingualLanguageLabel(
                                        translations[msg.id].language,
                                    ),
                                },
                            ]}
                        />
                    {:else}
                        {getMultilingualLanguageLabel(
                            translations[msg.id].language,
                        )}
                    {/if}
                </div>
            </div>
        {/if}
        {#if messageErrors[msg.id]}
            <Notice text={(l) => l.ui.collaborate.translate.messageError} />
        {/if}
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
        <div class="translate-bar">
            <label class="translate-label" for="{ids}-translate"
                ><LocalizedText
                    path={(l) => l.ui.collaborate.translate.label}
                /></label
            >
            <Options
                id="{ids}-translate"
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
                change={(chosen) => (translateTo = chosen)}
            />
            <Button
                tip={translateSearchExpanded
                    ? (l) => l.ui.collaborate.translate.fewerLanguages
                    : (l) => l.ui.collaborate.translate.moreLanguages}
                action={() =>
                    (translateSearchExpanded = !translateSearchExpanded)}
                expanded={translateSearchExpanded}
                controls="{ids}-translate-search"
                icon={SEARCH_SYMBOL}
            />
            {#if translateSearchExpanded}
                <LocaleSearch
                    id="{ids}-translate-search"
                    bind:query={translateQuery}
                />
            {/if}
            {#if translating}
                <Spinning
                    label={downloading === undefined
                        ? (l) => l.ui.collaborate.translate.translating
                        : undefined}
                />
                {#if downloading !== undefined && translateTo !== undefined}
                    <Note
                        ><MarkupHTMLView
                            inline
                            markup={[
                                (l) => l.ui.collaborate.translate.downloading,
                                {
                                    language:
                                        getMultilingualLanguageLabel(
                                            translateTo,
                                        ),
                                },
                            ]}
                        /></Note
                    >
                {/if}
            {/if}
            {#if translateTo !== undefined}
                <Button
                    tip={(l) => l.ui.collaborate.translate.off}
                    action={() => (translateTo = undefined)}
                    ><LocalizedText
                        path={(l) => l.ui.collaborate.translate.off}
                    /></Button
                >
                <!-- Only meaningful once translating costs something, which
                     is exactly when it doesn't move for an on-device pass. -->
                <TranslationMeter compact />
            {/if}
        </div>
        {#if translateError}
            <Notice>
                <MarkupHTMLView
                    markup={[
                        (l) => l.ui.collaborate.translate.error,
                        {
                            to:
                                translateTo === undefined
                                    ? ''
                                    : getMultilingualLanguageLabel(translateTo),
                        },
                    ]}
                />
            </Notice>
        {:else if translatedOnDevice}
            <Note
                ><LocalizedText
                    path={(l) => l.ui.collaborate.translate.onDevice}
                /></Note
            >
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
            <label class="language-label" for="{ids}-message-language"
                ><LocalizedText
                    path={(l) => l.ui.collaborate.translate.writingIn}
                /></label
            >
            <Options
                id="{ids}-message-language"
                value={messageLanguage}
                label={(l) => l.ui.collaborate.translate.writingIn}
                options={languagePickerLocales(
                    messageSearchExpanded,
                    messageQuery,
                ).map((locale) => ({
                    value: localeToString(locale),
                    label: getMultilingualLanguageLabel(locale),
                }))}
                change={(chosen) => (messageLanguageOverride = chosen)}
            />
            <Button
                tip={messageSearchExpanded
                    ? (l) => l.ui.collaborate.translate.fewerLanguages
                    : (l) => l.ui.collaborate.translate.moreLanguages}
                action={() => (messageSearchExpanded = !messageSearchExpanded)}
                expanded={messageSearchExpanded}
                controls="{ids}-message-language-search"
                icon={SEARCH_SYMBOL}
            />
            {#if messageSearchExpanded}
                <LocaleSearch
                    id="{ids}-message-language-search"
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

    .translate-bar,
    .language {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing-half);
        flex-shrink: 0;
        padding-block: calc(0.5 * var(--wordplay-spacing));
    }

    .language {
        justify-content: flex-end;
    }

    .translate-label,
    .language-label {
        font-size: small;
    }

    .translation {
        display: flex;
        flex-direction: column;
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        margin-block-start: calc(0.5 * var(--wordplay-spacing));
        padding-block-start: calc(0.5 * var(--wordplay-spacing));
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

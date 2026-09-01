<script module lang="ts">
    /** Element ids have to be unique in a document, and a page can hold more
     *  than one chat. The pattern MarkupHTMLView uses. */
    let idCounter = 0;
</script>

<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Options from '@components/widgets/Options.svelte';
    import TranslationMeter from '@components/app/TranslationMeter.svelte';
    import { getFunctionsInstance } from '@db/firebase';
    import getLocalTranslator from '@db/getLocalTranslator';
    import getPreferredTranslator from '@db/getPreferredTranslator';
    import type { TranslationBackend } from '@db/chooseTranslator';
    import {
        translateMarkupTexts,
        type MarkupTranslationInput,
    } from '@db/translateMarkup';
    import {
        SupportedLocales,
        type SupportedLocale,
    } from '@locale/SupportedLocales';
    import { getLanguageDirection } from '@locale/LanguageCode';
    import {
        localesAreEqual,
        localeToString,
        stringToLocale,
        type default as Locale,
    } from '@locale/Locale';
    import {
        getLocaleRegionNames,
        getMultilingualLanguageLabel,
    } from '@locale/LocaleText';
    import Loading from '@components/app/Loading.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import TileMessage from '@components/project/TileMessage.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import ReportMessage from './ReportMessage.svelte';
    import Emoji from '@components/app/Emoji.svelte';
    import MessageReactions from '@components/app/chat/MessageReactions.svelte';
    import ReactionPicker from '@components/app/chat/ReactionPicker.svelte';
    import { localizedNameOfGlyph } from '@unicode/glyphName';
    import {
        foundAnnouncement,
        reactionAnnouncement,
        referenceAnnouncement,
        threadAnnouncement,
    } from '@components/app/chat/chatAnnounce';
    import { groupThreads, replyCount } from '@db/chats/threads';
    import CodeReferenceChip from '@components/app/chat/CodeReferenceChip.svelte';
    import {
        linesOfNode,
        referenceLabel,
        referenceTargetOf,
    } from '@db/chats/codeReference';
    import {
        getAnnouncer,
        getEditors,
        getLinkedNode,
        getMessageRequest,
        getResolvedReferences,
        getUser,
    } from '@components/project/Contexts';
    import Toggle from '@components/widgets/Toggle.svelte';
    import {
        howToVisibility,
        projectVisibility,
    } from '@db/moderation/visibility';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import {
        type SerializedCodeReference,
        type SerializedMessage,
    } from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import {
        Chats,
        Galleries,
        Locales,
        Settings,
        chatThreadsSeen,
        locales,
    } from '@db/Database';
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
        /** Told whether someone is writing a message, so whatever is above the
         *  conversation can give it the room. */
        composing?: (writing: boolean) => void;
    }

    let {
        chat,
        creators,
        galleryID,
        project = undefined,
        howTo = undefined,
        composing = undefined,
    }: Props = $props();

    const user = getUser();
    const announce = getAnnouncer();

    /** Unique per instance, since a page can hold more than one chat. */
    const ids = `chat-${idCounter++}`;

    /** The conversation, once it is one. `chat` is four things — a Chat, `null`
     *  while it loads, `false` when it can't be reached, `undefined` before
     *  anyone has said anything — and every handler that writes to it needs the
     *  same narrowing. */
    let activeChat = $derived(
        chat === undefined || chat === null || chat === false
            ? undefined
            : chat,
    );

    /** Build a list of locales from tags, in order, without repeats. */
    function localesFrom(tags: (string | undefined)[]): Locale[] {
        const seen = new Set<string>();
        const found: Locale[] = [];
        for (const tag of tags) {
            if (tag === undefined || seen.has(tag)) continue;
            const locale = stringToLocale(tag);
            if (locale === undefined) continue;
            seen.add(tag);
            found.push(locale);
        }
        return found;
    }

    /** The languages this conversation is already in: the viewer's own first,
     *  then the chat's, then every language a message is tagged with. */
    let chatLocales = $derived(
        localesFrom([
            localeToString($locales.getLocale()),
            ...(chat
                ? [
                      chat.getLanguage(),
                      ...chat.getMessages().map((msg) => msg.language),
                  ]
                : []),
        ]),
    );

    /** What both pickers offer before anyone searches.
     *
     *  Deliberately *not* just the conversation's own languages, which is what
     *  this was first and is exactly backwards: an English speaker in an
     *  English chat was offered English and nothing else — the one language
     *  they demonstrably do not need it translated into. The languages
     *  Wordplay itself speaks are the useful shortlist, since a reader here
     *  has already chosen one of them to read the app in, and the search
     *  widens to all ~650. Both pickers use it: you may be writing in a
     *  language nobody in the conversation has used yet. */
    let offeredLocales = $derived(
        localesFrom([
            ...$locales.getLocales().map(localeToString),
            ...SupportedLocales,
            ...chatLocales.map(localeToString),
        ]),
    );

    /** A language's name, with its regions only when the name alone would
     *  appear twice — zh-CN and zh-TW are both 中文, and two identical options
     *  is worse than a longer one. */
    function localeLabel(locale: Locale, among: Locale[]): string {
        const label = getMultilingualLanguageLabel(locale);
        if (
            among.filter(
                (other) => getMultilingualLanguageLabel(other) === label,
            ).length < 2
        )
            return label;
        const regions = getLocaleRegionNames(locale);
        return regions.length === 0 ? label : `${label} (${regions.join('/')})`;
    }

    /** What language the next message is written in. Defaults to the viewer's
     *  own locale; the picker overrides it, for someone who reads Wordplay in
     *  one language and is writing in another. */
    let messageLanguageOverride = $state<string | undefined>(undefined);
    let messageLanguage = $derived(
        messageLanguageOverride ?? localeToString($locales.getLocale()),
    );

    /** Whether anyone but the reader has said anything that could be
     *  translated. We never translate your own messages, so until someone else
     *  speaks there is nothing for a target language to do — and offering the
     *  choice anyway meant a chat with yourself answered it with "there's
     *  nothing here to translate", which explains a control that should not
     *  have been there.
     *
     *  The three exclusions are exactly the ones `translateMessages` makes, so
     *  the control and the pass can never disagree about whether there is work
     *  to do. */
    let translatable = $derived(
        chat
            ? chat.getMessages().some((msg) => {
                  const state = chat.getMessageModeration(msg.id);
                  return (
                      msg.text !== null &&
                      (state === undefined || state === 'approved') &&
                      !($user && msg.creator === $user.uid)
                  );
              })
            : false,
    );

    /** What language to read the conversation in, or undefined for none.
     *
     *  Restored from the reader's saved choice, because the translations
     *  themselves are cached and cost nothing to show again — losing only the
     *  choice on reload made it look as though they had been thrown away. */
    let translateTo = $state<string | undefined>(
        Settings.getChatLanguage() ?? undefined,
    );

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

    /** Whether our servers did any of the work, which is the only time a
     *  creator's daily budget is worth showing. Nothing is spent translating on
     *  the device, and a meter reading zero beside a feature that costs nothing
     *  implies a price that isn't there. */
    let spentBudget = $state(false);

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

    /** The thread being read, by its root message's id, or undefined for the
     *  conversation itself. A drill-down rather than a panel beside the
     *  conversation: this lives in a tile that is often a narrow column, and
     *  there is nowhere beside it to put anything. */
    let thread = $state<string | undefined>(undefined);

    /** The conversation sorted into what was said in the room and what was said
     *  in a thread about one of those messages. */
    let threads = $derived(groupThreads(chat ? chat.getMessages() : []));

    /** The message the open thread is about, or undefined if it has since gone
     *  (deleted for everyone, or trimmed). */
    let threadRoot = $derived(
        thread === undefined
            ? undefined
            : threads.roots.find((m) => m.id === thread),
    );

    /** Leave a thread whose root is no longer in the conversation, rather than
     *  showing an empty panel with no way to tell why. */
    $effect(() => {
        if (thread !== undefined && threadRoot === undefined)
            thread = undefined;
    });

    /** How many replies this reader has already seen in a thread. Reads the
     *  store rather than the setting directly, so the marker clears the moment
     *  a thread is opened rather than at the next unrelated render. */
    function seen(root: string): number {
        return chat ? ($chatThreadsSeen[chat.getProjectID()]?.[root] ?? 0) : 0;
    }

    /** Open a thread, remember that its replies have now been read, and say
     *  whose it is and how many replies it holds — the two things that differ
     *  between one opening and the next. */
    function openThread(root: SerializedMessage) {
        if (activeChat === undefined) return;
        const count = replyCount(threads, root.id);
        thread = root.id;
        Settings.markThreadRead(activeChat.getProjectID(), root.id, count);
        if (announce && $announce)
            $announce(
                'chat-thread',
                $locales.getLanguages()[0],
                threadAnnouncement(
                    $locales,
                    // The username the conversation already shows beside every
                    // message, so this says nothing that isn't on screen.
                    creators[root.creator]?.getUsername(false) ?? '',
                    count,
                ),
            );
        // Focus the way into the thread rather than the composer: the control
        // that was pressed is gone with the list it was in, so without this
        // focus falls to the body and a keyboard reader is nowhere.
        tick().then(() => {
            if (backView) setKeyboardFocus(backView, 'Focus on thread header');
        });
    }

    /** Return to the conversation, putting focus back on the control that
     *  opened the thread. A drill-down that leaves focus at the top of the list
     *  makes a keyboard reader find their place again every time. */
    function leaveThread() {
        const root = thread;
        thread = undefined;
        tick().then(() => {
            const button = document
                .getElementById(`${ids}-reply-${root}`)
                ?.querySelector('button');
            if (button instanceof HTMLElement)
                setKeyboardFocus(button, 'Focus on the message left behind');
        });
    }

    /** The back control, so opening a thread can move focus into it. */
    let backView = $state<HTMLButtonElement | undefined>(undefined);

    /** The open thread's own scroller, kept at the newest reply the way the
     *  conversation's is. */
    let threadScrollerView = $state<HTMLDivElement | undefined>(undefined);
    $effect(() => {
        // Depend on the thread and its replies, so a reply that arrives while
        // it is open scrolls into view too.
        const replies = thread === undefined ? 0 : replyCount(threads, thread);
        void replies;
        tick().then(() => {
            if (threadScrollerView)
                threadScrollerView.scrollTop = threadScrollerView.scrollHeight;
        });
    });

    const emojiMaps = Locales.emojis;

    /** The reader's locales, as the codes the emoji maps are keyed by. Filtered
     *  rather than cast: a locale Wordplay doesn't ship has no emoji names to
     *  find, and asking for one would fetch nothing. */
    let localeCodes = $derived(
        $locales
            .getLocales()
            .map((l) => localeToString(l))
            .filter((code): code is SupportedLocale =>
                SupportedLocales.some((supported) => supported === code),
            ),
    );

    /** Fetch the emoji names for whatever the reader reads in. Here rather than
     *  in each message: it is 600KB of names, and one conversation needs it
     *  once. Without it a reaction is announced as its own glyph, which a
     *  screen reader has no word for. */
    $effect(() => {
        for (const code of localeCodes) Locales.loadEmojis(code);
    });

    /** What to call an emoji, falling back to the glyph itself. The fallback is
     *  here rather than at each call site because there were three of them and
     *  a name is never optional: an unnamed reaction pill has no accessible
     *  name at all. */
    function nameOfEmoji(emoji: string) {
        return localizedNameOfGlyph(emoji, localeCodes, $emojiMaps) || emoji;
    }

    /** Add or take back this reader's reaction, and say what happened. Here
     *  rather than in the message, because both a pill and the shared picker
     *  do it and the announcement should read the same either way. */
    function react(messageID: string, emoji: string, on: boolean) {
        if (activeChat === undefined) return;
        const message = activeChat.getMessage(messageID);
        if (message === undefined) return;
        const added = Chats.toggleReaction(activeChat, message, emoji, on);
        if (!announce || !$announce) return;
        if (!added) {
            $announce(
                'chat-reaction',
                $locales.getLanguages()[0],
                $locales.getPrimaryPlainText(
                    (l) => l.ui.collaborate.reaction.full,
                ),
            );
            return;
        }
        // Read the count back off the revised conversation rather than
        // arithmetic on the old one, so what is said is what happened.
        const people = Chats.chats
            .get(activeChat.getProjectID())
            ?.getReactions(messageID)?.[emoji]?.length;
        $announce(
            'chat-reaction',
            $locales.getLanguages()[0],
            reactionAnnouncement($locales, nameOfEmoji(emoji), people ?? 0, on),
        );
    }

    /** Which message's reaction picker is showing, and what it is anchored to.
     *  One picker for the conversation — see ReactionPicker. */
    let picking = $state<{ message: string; anchor: HTMLElement } | undefined>(
        undefined,
    );
    const pickerID = `${ids}-reactions`;

    const editors = getEditors();

    /** Whether this conversation can refer to code at all. A how-to's chat has
     *  no project, so there is nothing for a reference to point at. */
    let canReference = $derived(project !== undefined && editors !== undefined);

    /**
     * Whether the message being written is about wherever the caret is.
     *
     * The link lives on the message rather than in the editor. There used to be
     * a mode — the editors went read-only while you picked — and it was the
     * wrong shape: it had to be entered, left, and explained, and none of that
     * is anything the reader wanted to think about. A message either names some
     * code or it doesn't, this says which, and pressing it again is how you take
     * it back.
     */
    let linking = $state(false);

    /** The editor that had focus most recently.
     *
     *  Remembered rather than asked for, because by the time it is needed
     *  nothing is focused: pressing the link toggle and then clicking into the
     *  message box is the whole gesture, and an editor reports `focused` only
     *  while the caret is actually in it. Falling back to the first editor
     *  instead — which is what this did — silently retargeted the link to the
     *  wrong file the moment you started typing, in any project with more than
     *  one. */
    let lastFocusedEditor = $state<string | undefined>(undefined);
    $effect(() => {
        const focused = [...($editors?.values() ?? [])].find((e) => e.focused);
        if (focused) lastFocusedEditor = focused.sourceID;
    });

    /** The editor whose caret the link follows: whichever one has focus, or the
     *  one that had it last. The first editor is only the answer before anyone
     *  has touched any of them. */
    let referenceEditor = $derived.by(() => {
        if (editors === undefined) return undefined;
        const all = [...($editors?.values() ?? [])];
        return (
            all.find((e) => e.focused) ??
            all.find((e) => e.sourceID === lastFocusedEditor) ??
            all[0]
        );
    });

    const linked = getLinkedNode();
    const messageRequest = getMessageRequest();
    /** Where each message's reference points, resolved once by the project
     *  view — see the chip for why it isn't resolved per message. Absent in a
     *  how-to's chat, which has no project for a reference to point into. */
    const resolvedReferences = getResolvedReferences();
    let referenceResolutions = $derived(
        resolvedReferences ? $resolvedReferences : undefined,
    );

    /** Where a message's view is, since a thread's root is rendered twice — once
     *  in the room and once at the head of its own thread — and two elements
     *  cannot share an id. Which list it is in is what tells them apart, and is
     *  also what says which of the two a reveal should go to. */
    function messageViewID(id: string, inRoom: boolean): string {
        return `${ids}-message-${inRoom ? 'room' : 'thread'}-${id}`;
    }

    /** The message a gutter marker asked for, marked while the reader finds it.
     *  Cleared on a timer rather than on the next click: the mark is there to
     *  answer "which one", and once it has been read it is noise. */
    let found = $state<string | undefined>(undefined);
    let foundTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

    /** Show the message a marker in the code asked for. Opens its thread first
     *  when it is a reply, since a thread is where its replies live. */
    let lastRequestNonce: number | undefined = undefined;
    $effect(() => {
        const request = messageRequest ? $messageRequest : undefined;
        const conversation = activeChat;
        if (
            request === undefined ||
            request.nonce === lastRequestNonce ||
            conversation === undefined
        )
            return;
        lastRequestNonce = request.nonce;
        const id = request.message;
        untrack(() => {
            // A reply lives in its thread, so the thread has to be open before
            // the message exists to scroll to — and a message in the room needs
            // any open thread out of the way, since the room behind it is
            // covered and inert. Set directly rather than through openThread or
            // leaveThread, which announce and move focus: this is one gesture
            // and should say one thing.
            const inRoom = threads.roots.some((m) => m.id === id);
            const root = inRoom
                ? undefined
                : [...threads.repliesByRoot.entries()].find(([, replies]) =>
                      replies.some((r) => r.id === id),
                  )?.[0];
            // A message we cannot place at all — trimmed while the marker was
            // on screen — leaves the view exactly as it is.
            if (inRoom || root !== undefined) thread = root;

            const message = conversation.getMessage(id);
            if (announce && $announce && message)
                $announce(
                    'chat-reference',
                    $locales.getLanguages()[0],
                    foundAnnouncement(
                        $locales,
                        creators[message.creator]?.getUsername(false) ?? '',
                        message.text ?? '',
                    ),
                );

            // After the pin-to-bottom effects, which run on the same flush and
            // would otherwise drag the conversation away from what was asked
            // for.
            tick().then(() => {
                const view = document.getElementById(messageViewID(id, inRoom));
                if (view === null) return;
                view.scrollIntoView({ block: 'center' });
                setKeyboardFocus(view, 'Focus the message a marker asked for');
                found = id;
                if (foundTimeout !== undefined) clearTimeout(foundTimeout);
                foundTimeout = setTimeout(() => (found = undefined), 2000);
                if (messageRequest) messageRequest.set(undefined);
            });
        });
    });

    /** The code the message would be about, followed live so the chip, the
     *  editor's outline, and its footer all agree as the caret moves. */
    let pendingTarget = $derived.by(() => {
        if (!canReference || !linking) return undefined;
        const editor = referenceEditor;
        if (editor === undefined || project === undefined) return undefined;
        const node = referenceTargetOf(editor.caret);
        if (node === undefined) return undefined;
        const source = editor.caret.source;
        const index = project.getIndexOfSource(source);
        if (index < 0) return undefined;
        return {
            node,
            source,
            reference: {
                source: index,
                path: source.root.getPath(node),
                code: node.toWordplay(),
            },
        };
    });

    let pendingReference = $derived(pendingTarget?.reference);

    /** Tell the editors which code this message names, so the one that holds it
     *  can outline it and say so. */
    $effect(() => {
        linked?.set(pendingTarget?.node);
    });

    /** What the linked code is called, for the chip beside the message.
     *
     *  Measured from the node itself rather than by resolving the reference
     *  just built from it: the round trip could only ever come back with the
     *  same node, at the cost of a path walk and a serialization on every caret
     *  move. */
    let pendingLabel = $derived.by(() => {
        const target = pendingTarget;
        if (target === undefined) return undefined;
        const lines = linesOfNode(target.source, target.node);
        return lines === undefined
            ? undefined
            : referenceLabel($locales, lines.firstLine, lines.lastLine);
    });

    /** Say what the message is now about, and only when it changes: the caret
     *  moves with every arrow key, and repeating the same line back is noise. */
    let lastAnnouncedReference: string | undefined = undefined;
    $effect(() => {
        const label = linking ? pendingLabel : undefined;
        if (label === lastAnnouncedReference) return;
        lastAnnouncedReference = label;
        if (label === undefined || !announce || !$announce) return;
        $announce(
            'chat-reference',
            $locales.getLanguages()[0],
            referenceAnnouncement($locales, label),
        );
    });

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

    /** A first message waiting for the conversation it will go in.
     *
     *  Not awaited from `addChat`, deliberately: its `setDoc` doesn't settle
     *  while the backend is unreachable, so awaiting it would swallow a message
     *  written offline — the case the whole offline-create path exists for. The
     *  new chat arrives through the same push every other update does, and the
     *  message goes in then. Doubling as the in-flight flag matters too:
     *  `addChat` is a bare `setDoc` with no existence check, so a second send
     *  before the first lands would replace the conversation with an empty one.
     */
    let pending = $state<string | undefined>(undefined);
    let pendingLanguage: string | undefined = undefined;
    /** The code the very first message is about. A conversation is made by
     *  talking, so the first thing anyone says may well be about a line of
     *  code, and it would otherwise be the one message that lost its
     *  reference. */
    let pendingMessageReference: SerializedCodeReference | undefined =
        undefined;

    $effect(() => {
        const target = chat;
        const text = pending;
        if (target && text !== undefined) {
            pending = undefined;
            const reference = pendingMessageReference;
            pendingMessageReference = undefined;
            untrack(() =>
                Chats.addMessage(
                    target,
                    text,
                    pendingLanguage,
                    undefined,
                    reference,
                ),
            );
        }
    });

    /** Send, creating the conversation if this is the first thing anyone has
     *  said. A chat is made by talking rather than by pressing a button: the
     *  button put the tile's whole purpose behind a click and made an unused
     *  tile look broken. */
    function submitMessage() {
        if (newMessage.trim() === '' && pendingReference === undefined) return;
        if (chat)
            Chats.addMessage(
                chat,
                newMessage,
                messageLanguage,
                thread,
                pendingReference,
            );
        else if (chat === undefined && pending === undefined) {
            pending = newMessage;
            pendingLanguage = messageLanguage;
            pendingMessageReference = pendingReference;
            // The conversation's own language, which is the source for any
            // message written before per-message tagging, or by someone who
            // never touched the picker.
            const language = localeToString($locales.getLocale());
            if (project) Chats.addChat(project, gallery, language);
            else if (howTo) Chats.addChatToHowTo(howTo, gallery, language);
        } else return;
        newMessage = '';
        // The link belonged to the message that just went, not to the next
        // one: what you say next is usually about something else, and a link
        // left standing would quietly attach code nobody chose.
        linking = false;
        tick().then(() => {
            if (newMessageView)
                setKeyboardFocus(
                    newMessageView,
                    'Focus on chat after submitting',
                );
        });
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
        // Reset rather than left standing. A pass that finds everything already
        // cached returns before setting this, and the cache only ever holds
        // what our servers translated — so leaving the last pass's claim up
        // would tell a reader nothing was sent to us about messages that were.
        translatedOnDevice = false;
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

            // The message's own tag, then the conversation's, then the
            // reader's own language as a guess.
            //
            // The guess is doing real work: every message written before this
            // feature existed carries no tag, and every chat created before it
            // no language, so without it translation does nothing at all on any
            // existing conversation — which is all of them. It is only ever a
            // guess, and a wrong one costs quality rather than correctness: the
            // model reads what it is given rather than trusting `from`, and the
            // original is always still there above the translation. On-device
            // translation is the one that takes `from` literally, which is a
            // reason to tag messages, not a reason to translate nothing.
            const source =
                msg.language ??
                currentChat.getLanguage() ??
                localeToString($locales.getLocale());
            const fromLocale = stringToLocale(source);
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
            const reportProgress = {
                onBackend: (backend: TranslationBackend) =>
                    backends.add(backend),
                download: (loaded: number) => {
                    if (request === translateRequest)
                        downloading = loaded < 1 ? loaded : undefined;
                },
            };

            // Our servers are asked for second, and only if they can be
            // reached at all. A reader offline with a model already downloaded
            // can still read the conversation — which is most of the point of
            // translating on the device — and failing here before ever asking
            // the browser would take that away.
            const functions = await getFunctionsInstance();
            const translate = functions
                ? getPreferredTranslator(functions, reportProgress)
                : getLocalTranslator(reportProgress);

            const { translated, failed } = await translateMarkupTexts(
                toTranslate,
                toLocale,
                translate,
            );

            // A newer target was chosen while this ran; throw the result away.
            if (request !== translateRequest) return;

            const failedIDs: Record<string, boolean> = {};
            for (const id of failed) failedIDs[id] = true;
            for (const [id, text] of translated)
                next[id] = { language: target, text };

            translations = { ...cachedTranslations, ...next };
            messageErrors = failedIDs;
            // With no Firebase reachable there was only ever one backend, and
            // it reported nothing because it was never chosen between.
            translatedOnDevice =
                !functions || (backends.size === 1 && backends.has('device'));
            spentBudget = !translatedOnDevice;

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

    /** Cancel a pending pass when this view goes away.
     *
     *  Its own effect, with no dependencies, because a cleanup returned from
     *  the effect below runs before *every* re-run of that effect — not only on
     *  destroy — and so would cancel the pass it had just scheduled. */
    $effect(() => () => {
        if (translatePassTimeout !== undefined)
            clearTimeout(translatePassTimeout);
    });

    /** Keep translations live as messages arrive. */
    $effect(() => {
        if (!chat || translateTo === undefined) {
            if (translatePassTimeout !== undefined) {
                clearTimeout(translatePassTimeout);
                translatePassTimeout = undefined;
            }
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
                spentBudget = false;
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

        // Nothing new to translate — and, crucially, leave any pending pass
        // alone. This effect re-runs for reasons that have nothing to do with
        // the conversation's content, and cancelling the scheduled pass on the
        // way past meant the pass never ran at all: the re-run arrived inside
        // the 300ms window, cleared the timeout, recomputed the same key, and
        // returned here without setting another one.
        if (contentKey === lastTranslationContentKey) return;
        lastTranslationContentKey = contentKey;

        // The pass is debounced, not the choice: messages streaming in coalesce
        // into one pass once things settle, while choosing a language and
        // stopping both take effect at once.
        if (translatePassTimeout !== undefined)
            clearTimeout(translatePassTimeout);
        translatePassTimeout = setTimeout(() => {
            translatePassTimeout = undefined;
            untrack(() => void translateMessages());
        }, 300);
    });
</script>

{#snippet message(chat: Chat, msg: SerializedMessage, root: boolean)}
    {@const date = new Date(msg.time)}
    {@const state = chat.getMessageModeration(msg.id)}
    {@const replies = replyCount(threads, msg.id)}
    <div
        class="message"
        class:creator={$user?.uid === msg.creator}
        class:found={found === msg.id}
        id={messageViewID(msg.id, root)}
        tabindex="-1"
    >
        <div class="meta"
            ><CreatorView
                chrome={false}
                anonymize={false}
                creator={creators[msg.creator] ?? null}
                loading={!(msg.creator in creators)}
                reserve
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
                    background={false}
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
        <!-- What can be done with this message. The reply control only appears
             on a message in the room: threading is one level deep, so a reply
             inside a thread joins the thread it is already in rather than
             starting another. -->
        <div class="doing">
            {#if msg.reference && project && msg.text !== null}
                <CodeReferenceChip
                    reference={msg.reference}
                    resolved={referenceResolutions?.get(msg.id)}
                />
            {/if}
            {#if root}
                {@const unseen = replies - seen(msg.id)}
                <span id="{ids}-reply-{msg.id}">
                    <Button
                        tip={() =>
                            unseen > 0
                                ? $locales
                                      .concretize(
                                          (l) => l.ui.collaborate.thread.unseen,
                                          { count: unseen },
                                      )
                                      .toText()
                                : replies > 0
                                  ? $locales
                                        .concretize(
                                            (l) =>
                                                l.ui.collaborate.thread.replies,
                                            { count: replies },
                                        )
                                        .toText()
                                  : $locales.getPrimaryPlainText(
                                        (l) => l.ui.collaborate.thread.reply,
                                    )}
                        action={() => openThread(msg)}
                        ><span class="replies" class:unseen={unseen > 0}
                            >{#if replies > 0}<MarkupHTMLView
                                    inline
                                    markup={[
                                        (l) => l.ui.collaborate.thread.replies,
                                        { count: replies },
                                    ]}
                                />{:else}<LocalizedText
                                    path={(l) => l.ui.collaborate.thread.reply}
                                />{/if}</span
                        ></Button
                    >
                </span>
            {/if}
            <MessageReactions
                {chat}
                message={msg}
                {pickerID}
                nameOf={nameOfEmoji}
                react={(emoji, on) => react(msg.id, emoji, on)}
                picking={picking?.message === msg.id}
                open={(anchor) => (picking = { message: msg.id, anchor })}
                close={() => (picking = undefined)}
            />
        </div>
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
    {:else}
        <!-- The conversation, and the thread that covers it. An overlay rather
             than a swap for two reasons: it reads as being on top of the chat
             rather than as a different screen, and it leaves the message list
             mounted, so opening a thread is a paint instead of a teardown and
             rebuild of every message. -->
        <div class="conversation">
            <!-- Inert while a thread covers it. The thread is an overlay and
                 the conversation stays mounted behind it, so without this a
                 keyboard reader tabs straight out of the thread into messages
                 they cannot see, and a screen reader reads the whole room as
                 the thread's siblings. Nothing axe checks — an overlay is not
                 something it can see. -->
            <div
                class="scroller"
                bind:this={scrollerView}
                inert={threadRoot !== undefined}
            >
                <div class="messages">
                    <!-- The same empty state whether the conversation exists yet
                         or not: "no messages" is true either way, and which of
                         the two it is isn't the reader's concern. -->
                    {#if chat && threads.roots.length > 0}
                        {#each threads.roots as msg (msg.id)}
                            {@render message(chat, msg, true)}
                        {/each}
                    {:else}
                        <div class="nothing">
                            <Note
                                ><LocalizedText
                                    path={(l) => l.ui.collaborate.error.empty}
                                /></Note
                            >
                        </div>
                    {/if}
                </div>
            </div>
            {#if chat && threadRoot}
                <div class="thread">
                    <div class="thread-header">
                        <Button
                            bind:view={backView}
                            tip={(l) => l.ui.collaborate.thread.back}
                            action={leaveThread}
                            icon="‹"
                        ></Button>
                        <h2>
                            <LocalizedText
                                path={(l) => l.ui.collaborate.thread.header}
                            />
                        </h2>
                    </div>
                    <div class="scroller" bind:this={threadScrollerView}>
                        <div class="messages">
                            {@render message(chat, threadRoot, false)}
                            {#each threads.repliesByRoot.get(threadRoot.id) ?? [] as reply (reply.id)}
                                {@render message(chat, reply, false)}
                            {:else}
                                <div class="nothing">
                                    <Note
                                        ><LocalizedText
                                            path={(l) =>
                                                l.ui.collaborate.thread.empty}
                                        /></Note
                                    >
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}
        </div>
        <!-- One picker for the whole conversation, opened against whichever
             message's + was pressed. -->
        <ReactionPicker
            id={pickerID}
            anchor={picking?.anchor}
            nameOf={nameOfEmoji}
            pick={(emoji) => {
                const message = picking?.message;
                if (message !== undefined) react(message, emoji, true);
            }}
            close={() => (picking = undefined)}
        />
        <!-- Reading a conversation in another language and saying what
             language you are writing in are the same question asked twice,
             so they are one row, next to the field they are about. What is
             merely happening — a pass running, a model downloading, what it
             cost — goes underneath, where it can grow without moving the
             controls. -->
        <div class="chat-controls">
            {#if translatable}
                <label class="translate-label" for="{ids}-translate"
                    ><LocalizedText
                        path={(l) => l.ui.collaborate.translate.label}
                    /></label
                >
                <Options
                    id="{ids}-translate"
                    value={translateTo}
                    width="9em"
                    label={(l) => l.ui.collaborate.translate.label}
                    options={[
                        {
                            // The switch, not a placeholder: it is both the state
                            // this starts in and the way back to it, which is why
                            // "Stop translating" no longer has to sit there
                            // permanently to offer a way out.
                            value: undefined,
                            label: (l) => l.ui.collaborate.translate.none,
                        },
                        ...offeredLocales.map((locale) => ({
                            value: localeToString(locale),
                            label: localeLabel(locale, offeredLocales),
                        })),
                    ]}
                    change={(chosen) => {
                        translateTo = chosen;
                        Settings.setChatLanguage(chosen ?? null);
                    }}
                />
                {#if translating}
                    <!-- Only while a pass is running. Standing there when nothing
                         was happening, it read as the only way to undo a choice
                         the picker had already made — and doubled as the dismiss
                         for whatever notice was showing. -->
                    <Button
                        tip={(l) => l.ui.collaborate.translate.off}
                        action={() => {
                            translateTo = undefined;
                            Settings.setChatLanguage(null);
                        }}
                        ><LocalizedText
                            path={(l) => l.ui.collaborate.translate.off}
                        /></Button
                    >
                {/if}
            {/if}
            <label class="language-label writing" for="{ids}-message-language"
                ><LocalizedText
                    path={(l) => l.ui.collaborate.translate.writingIn}
                /></label
            >
            <Options
                id="{ids}-message-language"
                value={messageLanguage}
                label={(l) => l.ui.collaborate.translate.writingIn}
                options={offeredLocales.map((locale) => ({
                    value: localeToString(locale),
                    label: localeLabel(locale, offeredLocales),
                }))}
                change={(chosen) => (messageLanguageOverride = chosen)}
            />
        </div>
        <!-- Rendered only when it has something to say: an `:empty` rule
             can't do this, since the blocks inside leave anchor comments
             behind even when none of them renders. -->
        {#if translating || spentBudget}
            <div class="chat-status">
                {#if translating}
                    <!-- Always labelled: leaving it off falls back to a generic
                     "loading", which says less than "translating messages"
                     does even while the translator is still downloading. -->
                    <Spinning
                        label={(l) => l.ui.collaborate.translate.translating}
                    />
                    {#if downloading !== undefined && translateTo !== undefined}
                        <Note
                            ><MarkupHTMLView
                                inline
                                markup={[
                                    (l) =>
                                        l.ui.collaborate.translate.downloading,
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
                {#if spentBudget}
                    <!-- Only once our servers have actually done some of the work.
                     A meter beside a feature that cost nothing implies a price
                     that isn't there. -->
                    <TranslationMeter compact />
                {/if}
            </div>
        {/if}
        {#if translateError}
            <Notice>
                <div class="dismissable">
                    <MarkupHTMLView
                        markup={[
                            (l) => l.ui.collaborate.translate.error,
                            {
                                to:
                                    translateTo === undefined
                                        ? ''
                                        : getMultilingualLanguageLabel(
                                              translateTo,
                                          ),
                            },
                        ]}
                    />
                    <!-- Its own dismiss, rather than leaving the only way out
                         to be changing the language. A failure that cannot be
                         acknowledged sits there looking unresolved. -->
                    <Button
                        tip={(l) => l.ui.collaborate.translate.dismiss}
                        action={() => (translateError = false)}
                        icon={CANCEL_SYMBOL}
                    />
                </div>
            </Notice>
        {:else if translatedOnDevice}
            <Note
                ><LocalizedText
                    path={(l) => l.ui.collaborate.translate.onDevice}
                /></Note
            >
        {/if}
        <form
            class="new"
            data-sveltekit-keepfocus
            onfocusin={() => composing?.(true)}
            onfocusout={(event) => {
                // Only when focus actually leaves the composer: the editor's toolbar
                // and the send button are inside it, and treating a hop between them
                // as "done writing" would flap whatever is above open and shut.
                if (
                    !(event.currentTarget instanceof HTMLElement) ||
                    !(event.relatedTarget instanceof Node) ||
                    !event.currentTarget.contains(event.relatedTarget)
                )
                    composing?.(false);
            }}
        >
            <div class="editor">
                <FormattedEditor
                    id="new-message"
                    examples={false}
                    placeholder={thread === undefined
                        ? (l) => l.ui.collaborate.field.message.placeholder
                        : (l) => l.ui.collaborate.thread.placeholder}
                    description={(l) =>
                        l.ui.collaborate.field.message.description}
                    bind:view={newMessageView}
                    bind:text={newMessage}
                />
            </div>
            <div class="send">
                {#if canReference}
                    <!-- What this message is about, following the caret. No ✕
                         of its own: the toggle beside it is what takes the link
                         back, and two ways to do one thing is one too many. -->
                    {#if linking && pendingLabel !== undefined}
                        <span class="chosen">{pendingLabel}</span>
                    {/if}
                    <!-- A paperclip rather than a chain link: the markup
                         toolbar an inch away already spends 🔗 on web links,
                         and one glyph meaning two things in one composer is
                         worse than either meaning alone. This one attaches
                         code to a message. -->
                    <Toggle
                        tips={(l) => l.ui.collaborate.reference.mode}
                        on={linking}
                        toggle={() => (linking = !linking)}
                        ><Emoji text="📎" /></Toggle
                    >
                {/if}
                <Button
                    submit
                    active={pending === undefined &&
                        (newMessage.trim() !== '' ||
                            pendingReference !== undefined)}
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
    }

    /* The rules that separate the conversation from what is above and below it
       belong to the box, not to each scroller inside it: the thread has a
       scroller of its own and would otherwise draw a second pair. */
    .conversation {
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

    .chat-controls,
    .chat-status {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing-half);
        flex-shrink: 0;
        padding-block: calc(0.5 * var(--wordplay-spacing));
    }

    /* Reading is what you do with the conversation and writing is what you
       add to it, so they sit at opposite ends of the row they share. */
    .writing {
        margin-inline-start: auto;
    }

    .translate-label,
    .language-label {
        font-size: small;
    }

    /* Once a message is translated, the translation is what the reader is here
       to read, so it takes the body size while the original keeps the smaller
       one every message otherwise has. Both were already
       --wordplay-small-font-size, which is why shrinking the original changed
       nothing — the difference has to come from raising the translation.
       Indentation marks the pair as one message; a rule between two bubbles of
       equal weight doubled every message's height and read as two messages. */
    .translation > .what {
        font-size: var(--wordplay-font-size);
    }

    .translation {
        display: flex;
        flex-direction: column;
        gap: calc(0.25 * var(--wordplay-spacing));
        margin-inline-start: var(--wordplay-spacing);
        margin-block-start: calc(0.25 * var(--wordplay-spacing));
    }

    .dismissable {
        display: flex;
        flex-direction: row;
        align-items: start;
        gap: var(--wordplay-spacing);
    }

    /* Between the two rather than under them, at the indent: it names the step
       from one to the other, so it belongs where that step happens. */
    .lang-tag {
        font-size: x-small;
        opacity: 0.6;
        text-align: start;
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
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing-half);
    }

    /* The code the message being written is about. Gold, like the outline it
       corresponds to in the editor, so the two read as the same mark. */
    .chosen {
        color: var(--color-gold-text);
        font-weight: bold;
        font-size: var(--wordplay-small-font-size);
        white-space: nowrap;
    }

    .chosen {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 4);
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

    /* What can be done with a message, under it: replying and reacting. Wraps
       rather than scrolls, since a message with many reactions is still one
       message and pushing them off the edge hides them. */
    .doing {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        font-size: var(--wordplay-small-font-size);
    }

    .replies {
        white-space: nowrap;
    }

    /* Replies this reader hasn't seen. The text variant, not the brand hue:
       this is text, so it has to clear AA on the background it sits on. */
    .unseen {
        color: var(--color-gold-text);
        font-weight: bold;
    }

    /* The positioned box the thread covers. Only the message list, so the
       composer below it stays shared between the conversation and the thread. */
    .conversation {
        position: relative;
        flex: 1 1 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
    }

    /* Inset from the inline start so a sliver of the conversation stays
       visible behind it — that is what says the thread is on top of the chat
       rather than somewhere else. */
    .thread {
        position: absolute;
        inset: var(--wordplay-spacing);
        padding: var(--wordplay-spacing-half);
        z-index: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        background: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        box-shadow: var(--wordplay-spacing) var(--wordplay-spacing)
            var(--wordplay-spacing) rgb(0 0 0 / 25%);
    }

    /* An empty conversation's words start where a message's words do. A
       message looks padded because `.what` pads itself; a bare note has
       nothing of its own, which is what made it look arbitrarily placed. */
    .nothing {
        padding: var(--wordplay-spacing);
    }

    /* The message a marker in the code asked for, marked just long enough to
       answer "which one". A shake rather than a colour: the conversation
       already spends colour on whose message it is and what is new. */
    .message.found {
        animation: shake calc(var(--animation-factor) * 500ms) linear 2;
    }

    .thread-header {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        flex-shrink: 0;
    }

    .thread-header h2 {
        margin: 0;
        font-size: var(--wordplay-font-size);
    }
</style>

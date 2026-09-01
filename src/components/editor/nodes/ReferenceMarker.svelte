<!--
  The mark in a line's or block's gutter saying the conversation has something
  to say about this code (#820).

  A marker rather than an outline around the code, which is what this replaces.
  An outline was drawn whether or not anyone had the chat open, two references
  that overlapped drew over each other, and — the real problem — it led nowhere:
  you could see that something had been said and had no way to get to it. A
  marker in the margin is what a word processor puts beside a comment, and
  pressing it takes you to the words.

  One per line or block however many messages are about it. The label says how
  many and pressing it goes to the newest; the rest are next to it in the
  conversation anyway, which is where you are about to be.
-->
<script lang="ts">
    import { getMessageRequest } from '@components/project/Contexts';
    import Emoji from '@components/app/Emoji.svelte';
    import { locales } from '@db/Database';
    import { COLLABORATE_SYMBOL } from '@parser/Symbols';
    import { get } from 'svelte/store';

    interface Props {
        /** The messages about this code, oldest first. */
        messages: string[];
    }

    let { messages }: Props = $props();

    const request = getMessageRequest();

    function show(event: Event) {
        // The editor is underneath: without this the press would place the
        // caret, and on a marker that is never what was meant. The same
        // contract FoldButton keeps, including handling Enter and Space in
        // keydown — preventing the default there is what stops the browser's
        // synthesized click from firing this a second time.
        event.preventDefault();
        event.stopPropagation();
        const newest = messages[messages.length - 1];
        if (request === undefined || newest === undefined) return;
        // A nonce, because asking for the same message twice has to arrive
        // twice — see the context's own comment.
        request.set({
            message: newest,
            nonce: (get(request)?.nonce ?? 0) + 1,
        });
    }
</script>

<button
    type="button"
    class="reference-marker"
    aria-label={$locales
        .concretize((l) => l.ui.collaborate.reference.marker, {
            count: messages.length,
        })
        .toText()}
    onpointerdown={(event) => {
        event.preventDefault();
        event.stopPropagation();
    }}
    onclick={show}
    onkeydown={(event) => {
        // A bare Enter or Space only: Enter with a modifier belongs to the
        // editor's own shortcuts.
        if (
            (event.key === 'Enter' || event.key === ' ') &&
            !event.shiftKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey
        )
            show(event);
    }}><Emoji text={COLLABORATE_SYMBOL} /></button
>

<style>
    .reference-marker {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        /* WCAG 2.5.8 wants a 24×24 pointer target, and the bare glyph is
           smaller; the column RootView reserves is the same 24px, so the code
           beside it starts where it would with no marker there. Same floor
           MenuTrigger keeps for its own in-editor target. */
        min-width: var(--wordplay-marker-size);
        min-height: var(--wordplay-marker-size);
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        font-size: var(--wordplay-small-font-size);
        line-height: 1;
        vertical-align: middle;
        /* Drop the double-tap-zoom delay without disabling panning. */
        touch-action: manipulation;
    }

    .reference-marker:focus {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
        outline-offset: -1px;
    }
</style>

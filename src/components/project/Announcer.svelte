<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import type LanguageCode from '@locale/LanguageCode';
    import type Announcement from '@components/project/Announcement';
    import {
        AnnouncerQueue,
        type AnnouncementKind,
    } from '@components/project/announcerQueue';

    /** All queueing policy — lanes, pacing, dedupe — lives in AnnouncerQueue
     *  (see announcerQueue.ts); this component is just the live regions it
     *  presents into. */
    const queue = new AnnouncerQueue({
        present: (announcement, channel) => {
            if (channel === 'immediate') immediate = announcement;
            else current = announcement;
        },
    });

    /** A function we expose to other components to announce things with this component. */
    export function announce(
        kind: AnnouncementKind,
        language: LanguageCode | undefined,
        message: string,
    ) {
        queue.announce(kind, language, message);
    }

    let { announcer: _ = $bindable(undefined) } = $props();

    /** Set the announcer once mounted. */
    onMount(() => {
        _ = announce;
    });

    onDestroy(() => queue.stop());

    let current = $state<Announcement | undefined>(undefined);
    let immediate = $state<Announcement | undefined>(undefined);
</script>

<!-- Two regions, because two kinds of speech have opposite needs.

     Paced (polite): status the creator should hear without being interrupted
     mid-sentence — command results, output descriptions, notifications. The
     queue holds each for its reading time so a burst can't talk over itself.
     role="status" is implicitly polite and atomic; the previous
     role="alert" + aria-live="polite" sent contradictory eagerness signals
     that screen readers resolved differently.

     Immediate (assertive): the direct answer to a keystroke — character echo,
     caret movement, and rejected edits. These have to interrupt, including
     the screen reader's own "you are currently on…" chatter, or they arrive
     so late they're useless. This is what a real text field does when you
     type quickly: the newest character cuts off the previous one.

     The {#key} replaces the span per announcement so a repeated interrupt or
     a doubled keystroke gets a fresh node. Note this does NOT make a screen
     reader re-read unchanged text — it compares the region's text, and no DOM
     gymnastics change that. Stage output therefore describes what CHANGED
     rather than repeating itself (see describeChange.ts). -->
<div
    class="announcements paced"
    role="status"
    aria-atomic="true"
    data-kind={current?.kind}
>
    {#key current}{#if current}<span lang={current.language}>
                {current.text}
            </span>{/if}{/key}
</div>
<!-- Assertive, knowingly. VoiceOver plays its system alert sound for every
     assertive announcement (with or without role="alert"), so everything here
     comes with a chime. Editor character echo escaped this entirely: it's
     native now, spoken by the platform from the editor's mirrored textarea
     (#1248). What remains assertive is what must interrupt — failures
     (ignored, banner), the caret, and stage key input, which has no text
     field to echo from. -->
<div
    class="announcements immediate"
    aria-live="assertive"
    aria-atomic="true"
    data-kind={immediate?.kind}
>
    {#key immediate}{#if immediate}<span lang={immediate.language}>
                {immediate.text}
            </span>{/if}{/key}
</div>

<style>
    .announcements {
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        overflow: hidden;
        position: absolute;
        /* Anchor the 1px box to the top of the page. Without an anchor it sits
           at its static position — after the full-height app — where its single
           pixel extends the document and summons a page scrollbar. Position has
           no effect on screen readers; the live region announces regardless. */
        top: 0;
        left: 0;
        white-space: nowrap;
        width: 1px;
    }
</style>

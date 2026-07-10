<script lang="ts">
    import { onMount } from 'svelte';
    import type LanguageCode from '@locale/LanguageCode';
    import Announcement from '@components/project/Announcement';

    /** How long to wait before updating the live region. */
    const delay = 200;

    /** Kinds of announcement that represent per-keystroke character echo
     *  (typing in the code editor, typing on stage, etc.). These are
     *  processed FIFO with brief pacing — each character matters and must
     *  be heard in order, matching standard text-input behavior. Other
     *  kinds (status, notifications, value descriptions) are processed
     *  most-recent-only since only the latest state is interesting. */
    const TypeKinds = new Set(['type', 'keyinput']);

    /** A function we expose to other components to announce things with this component. */
    export function announce(
        id: string,
        language: LanguageCode | undefined,
        message: string,
    ) {
        // Enqueue the announcement
        announcements.push(new Announcement(id, language, message));

        // Has the current announcement been around long enough? Dequeue the next most recent.
        const delta = Date.now() - (current ? current.time : 0);
        // No current message or it's been more than a second? Dequeue.
        if (current === undefined || delta > delay) dequeue();
    }

    let { announcer: _ = $bindable(undefined) } = $props();

    /** Set the announcer once mounted. */
    onMount(() => {
        _ = announce;
    });

    function dequeue() {
        // Is there a timeout? Wait for it to dequue.
        if (timeout) return;

        // Pick the next announcement. For character-echo kinds we go in
        // strict FIFO order so the user hears every key in the order they
        // pressed them. For everything else, we keep only the most recent
        // — older status/notification updates are irrelevant once a newer
        // one arrives, and screen readers can't keep up with 30Hz noise
        // anyway.
        let next: Announcement | undefined;
        if (announcements.length > 0 && TypeKinds.has(announcements[0].kind)) {
            next = announcements.shift();
        } else {
            // Have we fallen behind? Trim everything by the most recent.
            if (announcements.length > 3) {
                const mostRecent = announcements.shift();
                if (mostRecent) announcements = [mostRecent];
            }
            next = announcements.pop();
            announcements = [];
        }

        if (next) {
            if (
                current === undefined ||
                next.text !== current.announcement.text ||
                TypeKinds.has(next.kind)
            ) {
                current = { announcement: next, time: Date.now() };

                // Character echo paces by a small fixed interval so rapid
                // typing flows smoothly. Other messages pace proportional
                // to reading time (300 wpm ≈ 5 wps ≈ 5 chars/word).
                let nextDelay: number;
                if (TypeKinds.has(next.kind)) {
                    nextDelay = 50;
                } else {
                    const wordCount = current.announcement.text.length / 5;
                    const wordsPerSecond = 3;
                    const secondsToRead = wordCount * (1 / wordsPerSecond);
                    nextDelay = Math.min(2000, secondsToRead * delay);
                }

                // Dequeue after the chosen delay.
                timeout = setTimeout(
                    () => {
                        // Clear the timeout (so the dequeue does something above), then dequeue to update the announcement.
                        timeout = undefined;
                        dequeue();
                    },
                    nextDelay,
                );
            }
        }
    }

    let announcements = $state<Announcement[]>([]);
    let current: { announcement: Announcement; time: number } | undefined =
        $state(undefined);
    let timeout: NodeJS.Timeout | undefined = undefined;
</script>

<!-- Create a new DOM element for each new announcement to increase the chances that it's read. -->
<div
    class="announcements"
    role="alert"
    aria-live="polite"
    aria-atomic="true"
    aria-relevant="all"
    data-kind={current?.announcement.kind}
>
    {#if current}<span lang={current.announcement.language}>
            {current.announcement.text}
        </span>{/if}
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

<script lang="ts">
    import type LanguageCode from '../../locale/LanguageCode';
    import Announcement from './Announcement';
    import type { AnnouncerContext } from './Contexts';

    const delay = 200;

    export const announce: AnnouncerContext = (
        id: string,
        language: LanguageCode | undefined,
        message: string,
    ) => {
        // Enqueue the announcement
        announcements.push(new Announcement(id, language, message));

        // Has the current announcement been around long enough? Dequeue the next most recent.
        const delta = Date.now() - (current ? current.time : 0);
        // No current message or it's been more than a second? Dequeue.
        if (current === undefined || delta > delay) dequeue();
    };

    function dequeue() {
        // Is there a timeout? Wait for it to dequue.
        if (timeout) return;

        // Have we fallen behind? Trim everything by the most recent.
        if (announcements.length > 3) {
            const mostRecent = announcements.shift();
            if (mostRecent) announcements = [mostRecent];
        }

        // Grab the message of a different kind from the current message, or the next one if there aren't any.
        let next = announcements.pop();
        announcements = [];

        if (next) {
            if (
                current === undefined ||
                next.text !== current.announcement.text
            ) {
                current = { announcement: next, time: Date.now() };

                // Decide when to dequeue the next message proportional to length of text,
                // assuming a lower 300 words/minute (5 words/second), and about 5 characters per word
                const wordCount = current.announcement.text.length / 5;
                const wordsPerSecond = 3;
                const secondsToRead = wordCount * (1 / wordsPerSecond);

                // Dequeue after the amount of reading time it takes, or 2 seconds, whatever is shorter.
                timeout = setTimeout(
                    () => {
                        // It's been a second. Clear the timeout (so the dequeue does something above), then dequeue to update the announncement.
                        timeout = undefined;
                        dequeue();
                    },
                    Math.min(2000, secondsToRead * delay),
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
        </span>
    {/if}
</div>

<style>
    .announcements {
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
        width: 1px;
    }
</style>

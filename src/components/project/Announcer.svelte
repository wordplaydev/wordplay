<script lang="ts">
    import type LanguageCode from '../../locale/LanguageCode';
    import Announcement from './Announcement';
    import type { Announce } from './Contexts';

    export const announce: Announce = (
        id: string,
        language: LanguageCode | undefined,
        message: string
    ) => {
        // Enqueue the announcement
        announcements.push(new Announcement(id, language, message));
        // Has the current announcement been around long enough? Dequeue the next most recent.
        const delta = Date.now() - (current ? current.time : 0);
        // No current message or it's been more than a second? Dequeue.
        if (current === undefined || delta > 1000) dequeue();
    };

    function dequeue() {
        // Is there a timeout? Wait for it to dequue.
        if (timeout) return;

        // Grab the message of a different kind from the current message, or the next one if there aren't any.
        let next = announcements.pop();
        announcements = [];

        if (next) {
            current = { announcement: next, time: Date.now() };

            // Decide when to dequeue the next message proportional to length of text,
            // assuming a lower 300 words/minute (5 words/second), and about 5 characters per word
            const wordCount = current.announcement.text.length / 5;
            const wordsPerSecond = 5;
            const secondsToRead = wordCount * (1 / wordsPerSecond);

            // Dequeue
            timeout = setTimeout(() => {
                // It's been a second. Clear the announcement and the timeout (so the dequeue does something above), then dequeue to update the announncement.
                current = undefined;
                timeout = undefined;
                dequeue();
            }, secondsToRead * 1000);
        }
    }

    let announcements: Announcement[] = [];
    let current: { announcement: Announcement; time: number } | undefined =
        undefined;
    let timeout: NodeJS.Timeout | undefined = undefined;
</script>

{#if current}
    <div
        class="announcements"
        aria-live="assertive"
        aria-atomic="true"
        aria-relevant="all"
        data-kind={current.announcement.kind}
        lang={current.announcement.language}
    >
        {current.announcement.text}
    </div>
{/if}

<style>
    .announcements {
        font-size: 0;
    }
</style>

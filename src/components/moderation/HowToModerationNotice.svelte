<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import { getBlocks, getWarnings } from '@db/projects/Moderation';

    interface Props {
        howTo: HowTo;
    }

    let { howTo }: Props = $props();

    // Which rules a denial found broken, in the same words a flagged project is
    // explained with. A denial carrying none of them is a decision about whether
    // the how-to is ready rather than about whether it breaks a rule — the shape
    // `KitModerationNotice` and `GalleryModerationNotice` already have.
    let blocked = $derived(getBlocks(howTo.getFlags(), $locales.getLocale()));
    let warned = $derived(getWarnings(howTo.getFlags(), $locales.getLocale()));
</script>

<!-- Where a how-to stands with the moderators (#906). This is where "why isn't
     mine in the guide" gets answered, which is why there is no notification for
     `pending`: it is shown where its author is already looking. Silent while
     `unrequested`, which would only repeat the button beside it. -->
{#if howTo.getModeration() === 'pending'}
    <Notice
        ><MarkupHTMLView markup={(l) => l.moderation.howto.pending} /></Notice
    >
{:else if howTo.getModeration() === 'approved'}
    <Notice
        ><MarkupHTMLView markup={(l) => l.moderation.howto.approved} /></Notice
    >
{:else if howTo.getModeration() === 'denied'}
    <Notice><MarkupHTMLView markup={(l) => l.moderation.howto.denied} /></Notice
    >
    {#if blocked.length > 0 || warned.length > 0}
        <ul>
            {#each [...blocked, ...warned] as reason}
                <li><MarkupHTMLView inline markup={reason} /></li>
            {/each}
        </ul>
    {/if}
{/if}

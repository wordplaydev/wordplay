<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import { getBlocks, getWarnings } from '@db/projects/Moderation';

    interface Props {
        gallery: Gallery;
    }

    let { gallery }: Props = $props();

    // Which rules a denial found broken, in the same words a flagged project is
    // explained with. A denial with none of these is a decision about whether
    // the gallery is finished, not about whether it breaks a rule (#1311).
    let blocked = $derived(
        getBlocks(gallery.getModerationFlags(), $locales.getLocale()),
    );
    let warned = $derived(
        getWarnings(gallery.getModerationFlags(), $locales.getLocale()),
    );
</script>

<!-- Where the gallery stands with the moderators. Shown above the public
     toggle rather than after a failed attempt: a curator who is waiting, or who
     was turned down, should find that out when they look. -->
{#if gallery.getModeration() === 'pending'}
    <Notice
        ><MarkupHTMLView markup={(l) => l.moderation.gallery.pending} /></Notice
    >
{:else if gallery.getModeration() === 'approved'}
    <Notice
        ><MarkupHTMLView
            markup={(l) => l.moderation.gallery.approved}
        /></Notice
    >
{:else if gallery.getModeration() === 'denied'}
    <Notice
        ><MarkupHTMLView markup={(l) => l.moderation.gallery.denied} /></Notice
    >
    {#if blocked.length > 0 || warned.length > 0}
        <ul>
            {#each [...blocked, ...warned] as reason}
                <li><MarkupHTMLView inline markup={reason} /></li>
            {/each}
        </ul>
    {/if}
{/if}

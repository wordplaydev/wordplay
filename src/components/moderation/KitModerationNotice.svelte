<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
    import type { SerializedKit } from '@db/kits/Kit';
    import { getBlocks, getWarnings } from '@db/projects/Moderation';

    interface Props {
        kit: SerializedKit;
        /** The state to speak from. The publish panel passes the one the kit is *about*
         *  to have, since the client never writes `moderation` itself. */
        moderation?: SerializedKit['moderation'];
    }

    let { kit, moderation = kit.moderation }: Props = $props();

    // Which rules a denial found broken, in the same words a flagged project is explained
    // with. A denial with none of these is a decision about whether the kit is ready, not
    // about whether it breaks a rule — the shape `GalleryModerationNotice` already has.
    let blocked = $derived(getBlocks(kit.flags, $locales.getLocale()));
    let warned = $derived(getWarnings(kit.flags, $locales.getLocale()));
</script>

<!-- Where the kit stands with the moderators, in the register a decision deserves: a
     creator who marked a kit listed and cannot find it in the guide is looking at a
     contradiction, and an italic aside at the bottom of a dialog does not answer it.
     Silent while `unrequested`, which only repeats the control beside it. -->
{#if moderation === 'pending'}
    <Notice><MarkupHTMLView markup={(l) => l.moderation.kit.pending} /></Notice>
{:else if moderation === 'approved'}
    <Notice><MarkupHTMLView markup={(l) => l.moderation.kit.approved} /></Notice
    >
{:else if moderation === 'denied'}
    <Notice><MarkupHTMLView markup={(l) => l.moderation.kit.denied} /></Notice>
    {#if blocked.length > 0 || warned.length > 0}
        <ul>
            {#each [...blocked, ...warned] as reason}
                <li><MarkupHTMLView inline markup={reason} /></li>
            {/each}
        </ul>
    {/if}
{/if}

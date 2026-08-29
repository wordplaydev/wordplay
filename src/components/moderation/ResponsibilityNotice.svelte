<!-- Says who reviews a piece of content, wherever a creator can see it (#938).

     One component rather than a sentence per surface, and it takes a
     `Visibility` rather than a hand-picked message, so the share dialog, the
     gallery page, a chat, a how-to, and the report button all say what the
     server will actually enforce. A surface that phrased this for itself would
     eventually promise a reviewer nobody assigned.

     Deliberately says something in every case, including when the answer is
     "nobody": a creator deciding whether to share something should learn who
     can review it *before* they post, not after someone reports it. -->
<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import getResponsibility from '@db/moderation/responsibility';
    import type { Visibility } from 'shared-types';

    interface Props {
        /** What is being shared, in the terms responsibility depends on. */
        visibility: Visibility;
        /** The gallery's name, when there is one to name. */
        gallery?: string;
    }

    let { visibility, gallery = '' }: Props = $props();

    const responsibility = $derived(getResponsibility(visibility));
</script>

{#if responsibility.kind === 'none'}
    <MarkupHTMLView markup={(l) => l.moderation.responsibility.none} />
{:else if responsibility.kind === 'curators'}
    <MarkupHTMLView
        markup={[
            (l) => l.moderation.responsibility.curators,
            { name: gallery },
        ]}
    />
{:else if responsibility.kind === 'both'}
    <MarkupHTMLView
        markup={[(l) => l.moderation.responsibility.both, { name: gallery }]}
    />
{:else}
    <MarkupHTMLView markup={(l) => l.moderation.responsibility.platform} />
{/if}

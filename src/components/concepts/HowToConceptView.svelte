<script lang="ts">
    import { goto } from '$app/navigation';
    import Subheader from '@components/app/Subheader.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import Button from '@components/widgets/Button.svelte';
    import type GalleryHowConcept from '@concepts/GalleryHowConcept';
    import { locales } from '@db/Database';
    import MarkupHTMLView from './MarkupHTMLView.svelte';

    interface Props {
        concept: GalleryHowConcept;
    }

    let { concept }: Props = $props();

    let preferredLocale: string = $derived($locales.getLocaleString());
</script>

<Subheader>{concept.howTo.getTitleInLocale(preferredLocale)}</Subheader>

<Speech below character={concept.getCharacter()}>
    {#snippet content()}
        {@const markup = concept.howTo.getTextInLocale(preferredLocale)}
        {#if markup}
            <MarkupHTMLView {markup} />
        {:else}
            {$locales.concretize((l) => l.ui.docs.nodoc)}
        {/if}
    {/snippet}
</Speech>

<Button
    label={(l) => l.ui.docs.how.howToGalleryButton.label}
    tip={(l) => l.ui.docs.how.howToGalleryButton.tip}
    action={() => goto(concept.getPath())}
/>

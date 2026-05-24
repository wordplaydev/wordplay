<script lang="ts">
    import { goto } from '$app/navigation';
    import Subheader from '@components/app/Subheader.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import type GalleryHowConcept from '@concepts/GalleryHowConcept';
    import { HowTos, locales } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import { onMount } from 'svelte';
    import MarkupHTMLView from './MarkupHTMLView.svelte';

    interface Props {
        concept: GalleryHowConcept;
    }

    let { concept }: Props = $props();

    let preferredLocale: string = $derived($locales.getLocaleString());

    // add the user to the list of those who have viewed this how-to
    const user = getUser();

    onMount(() => {
        let seenByUsers = concept.howTo.getSeenByUsers();

        if ($user && !seenByUsers.includes($user.uid)) {
            seenByUsers.push($user.uid);
        }

        HowTos.updateHowTo(
            new HowTo({
                ...concept.howTo.getData(),
                social: {
                    ...concept.howTo.getSocial(),
                    seenByUsers: seenByUsers,
                    viewCount: concept.howTo.getViewCount() + 1,
                },
            }),
            true,
        );
    });
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

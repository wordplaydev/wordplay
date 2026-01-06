<script lang="ts">
    import Action from '@components/app/Action.svelte';
    import BigLink from '@components/app/BigLink.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import { HowToSocials, locales } from '@db/Database';
    import type HowToSocial from '@db/howtos/HowToSocialDatabase.svelte';
    import { docToMarkup } from '@locale/LocaleText';
    import { DOCUMENTATION_SYMBOL } from '@parser/Symbols';
    import Iconified from '../../../Iconified.svelte';

    interface Props {
        galleryID: string;
        projectsEditable: boolean;
    }

    let { galleryID, projectsEditable }: Props = $props();
    const user = getUser();

    let howToSocialData: HowToSocial[] = $state([]);
    $effect(() => {
        if (!galleryID) {
            howToSocialData = [];
            return;
        }

        HowToSocials.getHowToSocialsForGallery(galleryID).then((data) => {
            if (data) howToSocialData = data;
        });
    });

    let totalHowTos: number = $derived(howToSocialData.length);
    let newHowTos: number = $derived(
        howToSocialData.filter((ht) => {
            const seenBy = ht.getSeenByUsers();
            return $user && seenBy && !seenBy.includes($user.uid);
        }).length,
    );
</script>

<Action>
    <BigLink to={`/gallery/${galleryID}/howto`}
        ><Iconified
            icon={DOCUMENTATION_SYMBOL}
            text={(l) => l.ui.howto.galleryView.header}
        /></BigLink
    >

    {#if totalHowTos > 0 || !projectsEditable}
        <MarkupHTMLView
            inline
            markup={docToMarkup(
                $locales.get((l) => l.ui.howto.galleryView.subheader),
            ).concretize($locales, [totalHowTos, newHowTos]) ?? ''}
        />
    {:else}
        <MarkupHTMLView
            inline
            markup={docToMarkup(
                $locales.get((l) => l.ui.howto.galleryView.subheaderEmpty),
            ) ?? ''}
        />
    {/if}
</Action>

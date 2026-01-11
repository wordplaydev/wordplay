<script lang="ts">
    import Action from '@components/app/Action.svelte';
    import BigLink from '@components/app/BigLink.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import { HowTos, locales } from '@db/Database';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import { docToMarkup } from '@locale/LocaleText';
    import { DOCUMENTATION_SYMBOL } from '@parser/Symbols';
    import Iconified from '../../../Iconified.svelte';

    interface Props {
        galleryID: string | undefined;
        projectsEditable: boolean;
    }

    let { galleryID, projectsEditable }: Props = $props();
    const user = getUser();

    let howTos: HowTo[] = $state([]);
    $effect(() => {
        if (!galleryID) {
            howTos = [];
            return;
        }

        HowTos.getHowTos(galleryID).then((data) => {
            if (data) howTos = data;
        });
    });

    let totalHowTos: number = $derived(
        howTos.filter((ht) => ht.isPublished()).length,
    );
    let newHowTos: number = $derived(
        howTos.filter((ht) => {
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

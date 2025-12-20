<script lang="ts">
    import Action from '@components/app/Action.svelte';
    import BigLink from '@components/app/BigLink.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { HowTos, locales } from '@db/Database';
    import { docToMarkup } from '@locale/LocaleText';
    import { DOCUMENTATION_SYMBOL } from '@parser/Symbols';
    import Iconified from '../../../Iconified.svelte';

    interface Props {
        galleryID: string;
        projectsEditable: boolean;
    }

    let { galleryID, projectsEditable }: Props = $props();

    let totalHowTos = $state(0);

    $effect(() => {
        HowTos.getHowTos(galleryID).then(
            (hts) => (totalHowTos = hts ? hts.length : 0),
        );
    });

    const newHowTos = 5; // TODO(@mc) -- fix this hardcoded value
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

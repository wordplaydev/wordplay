<script lang="ts">
    import { untrack } from 'svelte';
    import Action from '@components/app/Action.svelte';
    import BigLink from '@components/app/BigLink.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import { Galleries, HowTos } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import { DOCUMENTATION_SYMBOL } from '@parser/Symbols';
    import Iconified from '../../../Iconified.svelte';

    interface Props {
        gallery: Gallery;
        projectsEditable: boolean;
    }

    let { gallery, projectsEditable }: Props = $props();
    const user = getUser();

    // Watching rather than fetching the gallery's list: one subscription shared
    // with every other surface showing this gallery, and it keeps the count
    // current for a signed-out visitor too.
    // Keyed on the id, never the gallery object: each snapshot the watch
    // receives is written into `publicGalleries`, which re-resolves `gallery`
    // to a new instance — so an effect that depended on the instance would tear
    // its own subscription down and start another on every snapshot, and never
    // live long enough to deliver one.
    let watchedGalleryID = $derived(gallery.getID());
    // `untrack`, because acquiring the watch reads the gallery maps to decide
    // what to subscribe to — and the watch then writes each snapshot back into
    // `publicGalleries`. Tracked, those reads make the effect depend on its own
    // output: it tears its subscription down and starts another on every
    // snapshot, thousands of times a second, and never lives long enough to
    // deliver one.
    $effect(() => {
        const id = watchedGalleryID;
        return untrack(() => Galleries.watchPublic(id));
    });

    let howTos: HowTo[] = $derived(HowTos.howTosInGallery(gallery.getID()));

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
    <BigLink to={`/gallery/${gallery.getID()}/howto`}
        ><Iconified
            icon={DOCUMENTATION_SYMBOL}
            text={(l) => l.ui.howto.galleryView.header}
        /></BigLink
    >

    {#if totalHowTos > 0 || !projectsEditable}
        <MarkupHTMLView
            inline
            markup={[
                (l) => l.ui.howto.galleryView.subheader,
                { total: totalHowTos, new: newHowTos },
            ]}
        />
    {:else}
        <MarkupHTMLView
            inline
            markup={(l) => l.ui.howto.galleryView.subheaderEmpty}
        />
    {/if}
</Action>

<!-- Galleries asking to be listed (#938).

     The decision and its chrome are `ModerationQueue`'s; what is here is the gallery
     itself, which is judged by what it holds. -->
<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
    import type { SerializedGallery } from '@db/galleries/Gallery';
    import Gallery, { upgradeGallery } from '@db/galleries/Gallery';
    import { GalleriesCollection } from '@db/galleries/GalleryDatabase.svelte';
    import GalleryProjects from './GalleryProjects.svelte';
    import ModerationQueue from './ModerationQueue.svelte';
</script>

<ModerationQueue
    kind="gallery"
    collectionName={GalleriesCollection}
    order={{ field: 'id' }}
    parse={(data) => new Gallery(upgradeGallery(data as SerializedGallery))}
    idOf={(gallery) => gallery.getID()}
    text={{
        header: (l) => l.moderation.moderate.header,
        done: (l) => l.moderation.gallery.done,
        explain: (l) => l.moderation.gallery.explain,
        approve: {
            tip: (l) => l.moderation.gallery.approve.tip,
            label: (l) => l.moderation.gallery.approve.label,
        },
        deny: {
            tip: (l) => l.moderation.gallery.deny.tip,
            label: (l) => l.moderation.gallery.deny.label,
        },
        skip: {
            tip: (l) => l.moderation.gallery.skip.tip,
            label: (l) => l.moderation.gallery.skip.label,
        },
    }}
>
    {#snippet content(gallery)}
        <Subheader wrap>{gallery.getName($locales)}</Subheader>
        <MarkupHTMLView markup={gallery.getDescription($locales)} />
        <GalleryProjects {gallery} />
    {/snippet}
</ModerationQueue>

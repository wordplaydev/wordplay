<script lang="ts">
    import { page } from '$app/state';
    import { HowTos } from '@db/Database';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import HowToDrafts from './HowToDrafts.svelte';
    import HowToPreview from './HowToPreview.svelte';

    interface Props {
        currentViewLeft: number;
        currentViewTop: number;
    }

    let { currentViewLeft, currentViewTop }: Props = $props();

    let galleryId = decodeURI(page.params.galleryid);
    let howTos: HowTo[] = $state([]);

    async function loadHowTos() {
        howTos = (await HowTos.getHowTos(galleryId)) || [];
        console.log('loaded howTos:', howTos);
    }

    $effect(() => {
        if (galleryId) loadHowTos();
    });
</script>

{#each howTos as howto, i (i)}
    <!-- {#if howto.getCoordinates()[0] >= currentViewLeft - 100 && howto.getCoordinates()[0] <= currentViewRight + 100 && howto.getCoordinates()[1] >= currentViewTop - 100 && howto.getCoordinates()[1] <= currentViewBottom + 100} -->
    <HowToPreview howTo={howto} />
    <!-- {/if} -->
{/each}

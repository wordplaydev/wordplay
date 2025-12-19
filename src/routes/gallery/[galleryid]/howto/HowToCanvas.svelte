<script lang="ts">
    import { page } from '$app/state';
    import { HowTos } from '@db/Database';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import HowToPreview from './HowToPreview.svelte';

    interface Props {
        currentViewLeft: number;
        currentViewRight: number;
        currentViewTop: number;
        currentViewBottom: number;
    }

    let {
        currentViewLeft,
        currentViewRight,
        currentViewTop,
        currentViewBottom,
    }: Props = $props();

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

<div class="howtocanvas">
    {#each howTos as howto, i (i)}
        {#if howto.getCoordinates()[0] >= currentViewLeft - 100 && howto.getCoordinates()[0] <= currentViewRight + 100 && howto.getCoordinates()[1] >= currentViewTop - 100 && howto.getCoordinates()[1] <= currentViewBottom + 100}
            <HowToPreview
                title={howto.getTitle()}
                preview={howto.getText()[0]}
                xcoord={howto.getCoordinates()[0] - currentViewLeft}
                ycoord={howto.getCoordinates()[1] - currentViewTop}
            />
        {/if}
    {/each}
</div>

<style>
    .howtocanvas {
        position: relative;
        height: 100%;
        width: 100%;
        border: 1px solid var(--wordplay-border-color);
    }
</style>

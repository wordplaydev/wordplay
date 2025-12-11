<script lang="ts">
    import { onMount } from 'svelte';
    import HowToPreview from './HowToPreview.svelte';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import HowToForm from './HowToForm.svelte';

    let canvas: HTMLDivElement;

    let width: number;
    let height: number;
    let currentViewTop: number;
    let currentViewLeft: number;
    let currentViewBottom: number;
    let currentViewRight: number;

    onMount(() => {
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
        }

        currentViewTop = 0;
        currentViewLeft = 0;
        currentViewBottom = height;
        currentViewRight = width;
    });

    function onKeyDown(event) {
        console.log('key down', event.keyCode);
        switch (event.keyCode) {
            case 38: // up arrow
                let amountToChangeTop = Math.min(10, currentViewTop);
                currentViewTop -= amountToChangeTop;
                currentViewBottom -= amountToChangeTop;
                break;
            case 40: // down arrow
                currentViewTop += 10;
                currentViewBottom += 10;
                break;
            case 37: // left arrow
                let amountToChangeLeft = Math.min(10, currentViewLeft);
                currentViewLeft -= amountToChangeLeft;
                currentViewRight -= amountToChangeLeft;
                break;
            case 39: // right arrow
                currentViewLeft += 10;
                currentViewRight += 10;
                break;
        }

        console.log(
            `${currentViewTop}, ${currentViewLeft}, ${currentViewBottom}, ${currentViewRight}`,
        );
    }

    let testData: HowTo[] = [
        new HowTo({
            'id': 'howto1',
            'timestamp': 0,
            'galleryId': 'gallery1',
            'published': true,
            'xcoord': 0,
            'ycoord': 0,
            'title': 'How to make a sandwich',
            'guidingQuestions': ['tell us the story of how you learned this'],
            'text': ['do something'],
            'creator': 'croissant',
            'collaborators': [],
            locales: ['en-US'],
            reactions: new Map<string, string[]>(),
            usedByProjects: [],
            chat: null,
        }),
        new HowTo({
            'id': 'howto2',
            'timestamp': 0,
            'galleryId': 'gallery1',
            'published': true,
            'xcoord': 100,
            'ycoord': 100,
            'title': 'How to make a pie',
            'guidingQuestions': ['tell us the story of how you learned this'],
            'text': ['do something else'],
            'creator': 'baguette',
            'collaborators': [],
            locales: ['en-US'],
            reactions: new Map<string, string[]>(),
            usedByProjects: [],
            chat: null,
        }),
        new HowTo({
            'id': 'howto3',
            'timestamp': 0,
            'galleryId': 'gallery1',
            'published': true,
            'xcoord': 500,
            'ycoord': 500,
            'title': 'How to make a cake',
            'guidingQuestions': ['tell us the story of how you learned this'],
            'text': ['do another thing'],
            'creator': 'donut',
            'collaborators': [],
            locales: ['en-US'],
            reactions: new Map<string, string[]>(),
            usedByProjects: [],
            chat: null,
        }),
    ];
</script>

<div class="howtocanvas" bind:this={canvas}>
    {#each testData as howto, i (i)}
    {#if howto.getCoordinates()[0] >= currentViewLeft - 100 && howto.getCoordinates()[0] <= currentViewRight + 100
        && howto.getCoordinates()[1] >= currentViewTop - 100 && howto.getCoordinates()[1] <= currentViewBottom + 100}
        <HowToPreview
                title={howto.getTitle()}
                preview={howto.getText()[0]}
                xcoord={howto.getCoordinates()[0] - currentViewLeft}
                ycoord={howto.getCoordinates()[1] - currentViewTop}
            />
    {/if}
    {/each}
</div>
<svelte:window on:keydown|preventDefault={onKeyDown} />

<style>
    .howtocanvas {
        position: relative;
        height: 100%;
        width: 100%;
        border: 1px solid var(--wordplay-border-color);
    }
</style>

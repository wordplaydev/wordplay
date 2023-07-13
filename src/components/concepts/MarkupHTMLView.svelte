<svelte:options immutable />

<script lang="ts">
    import { creator } from '../../db/Creator';
    import type Markup from '../../nodes/Markup';
    import SegmentHTMLView from './SegmentHTMLView.svelte';

    export let markup: Markup;

    $: spaces = markup.spaces;
</script>

{#if spaces}{#each markup.paragraphs as paragraph, index}<p
            class="paragraph"
            class:animated={$creator.getAnimationFactor() > 0}
            style="--delay:{$creator.getAnimationDuration() * index * 0.1}ms"
            >{#each paragraph.segments as segment}<SegmentHTMLView
                    {segment}
                    {spaces}
                    alone={paragraph.segments.length === 1}
                />{/each}</p
        >{/each}{:else}missing spaces{/if}

<style>
    .paragraph.animated {
        transform: scaleY(0);
        animation-name: pop;
        animation-duration: 200ms;
        animation-delay: var(--delay);
        animation-fill-mode: forwards;
        transform-origin: top;
    }

    @keyframes pop {
        0% {
            opacity: 0;
            transform: scaleY(0);
        }
        80% {
            opacity: 0.9;
            transform: scaleY(1.05);
        }
        100% {
            opacity: 1;
            transform: scaleY(1);
        }
    }
</style>

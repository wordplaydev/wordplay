<svelte:options immutable />

<script context="module" lang="ts">
    type ParagraphOrList = Paragraph | { items: Paragraph[] };
</script>

<script lang="ts">
    import { creator } from '../../db/Creator';
    import type Markup from '../../nodes/Markup';
    import Paragraph from '../../nodes/Paragraph';
    import SegmentHTMLView from './SegmentHTMLView.svelte';

    export let markup: Markup;

    $: spaces = markup.spaces;

    // Convert sequences of paragraphs that start with bullets into an HTML list.
    const paragraphsAndLists: ParagraphOrList[] = markup.paragraphs.reduce(
        (stuff: ParagraphOrList[], next: Paragraph) => {
            if (next.isBulleted()) {
                const withoutBullet = next.withoutBullet();
                const previous = stuff.at(-1);
                if (previous instanceof Paragraph)
                    return [...stuff, { items: [withoutBullet] }];
                else if (previous !== undefined) {
                    previous.items.push(withoutBullet);
                    return stuff;
                } else return [{ items: [next] }];
            } else return [...stuff, next];
        },
        []
    );
</script>

{#if spaces}{#each paragraphsAndLists as paragraphOrList, index}<p
            class="paragraph"
            class:animated={$creator.getAnimationFactor() > 0}
            style="--delay:{$creator.getAnimationDuration() * index * 0.1}ms"
            >{#if paragraphOrList instanceof Paragraph}
                {#each paragraphOrList.segments as segment}<SegmentHTMLView
                        {segment}
                        {spaces}
                        alone={paragraphOrList.segments.length === 1}
                    />{/each}{:else}<ul
                    >{#each paragraphOrList.items as paragraph}<li
                            >{#each paragraph.segments as segment}<SegmentHTMLView
                                    {segment}
                                    {spaces}
                                    alone={paragraph.segments.length === 1}
                                />{/each}</li
                        >{/each}</ul
                >{/if}</p
        >{/each}{:else}-{/if}

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

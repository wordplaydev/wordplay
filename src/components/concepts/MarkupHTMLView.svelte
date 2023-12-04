<svelte:options immutable />

<script context="module" lang="ts">
    type ParagraphOrList = Paragraph | { items: Paragraph[] };
</script>

<script lang="ts">
    import { animationDuration, animationFactor } from '../../db/Database';
    import Markup from '@nodes/Markup';
    import Paragraph from '@nodes/Paragraph';
    import SegmentHTMLView from './SegmentHTMLView.svelte';

    export let markup: Markup | string[] | string;
    export let inline = false;

    $: parsed =
        markup instanceof Markup
            ? markup
            : Markup.words(
                  Array.isArray(markup) ? markup.join('\n\n') : markup
              );

    $: spaces = parsed.spaces;

    // Convert sequences of paragraphs that start with bullets into an HTML list.
    $: paragraphsAndLists = parsed.paragraphs.reduce(
        (stuff: ParagraphOrList[], next: Paragraph) => {
            if (next.isBulleted()) {
                const previous = stuff.at(-1);
                if (previous instanceof Paragraph)
                    return [...stuff, { items: [next] }];
                else if (previous !== undefined) {
                    previous.items.push(next);
                    return stuff;
                } else return [{ items: [next] }];
            } else return [...stuff, next];
        },
        []
    );
</script>

{#if spaces}
    {#if inline}
        {#each parsed.asLine().paragraphs[0].segments as segment}
            <SegmentHTMLView {segment} {spaces} alone={false} />
        {/each}
    {:else}{#each paragraphsAndLists as paragraphOrList, index}{#if paragraphOrList instanceof Paragraph}
                <p
                    class="paragraph"
                    class:animated={$animationFactor > 0}
                    style="--delay:{$animationDuration * index * 0.1}ms"
                    >{#each paragraphOrList.segments as segment}<SegmentHTMLView
                            {segment}
                            {spaces}
                            alone={paragraphOrList.segments.length === 1}
                        />{/each}</p
                >{:else}<ul
                    class:animated={$animationFactor > 0}
                    style="--delay:{$animationDuration * index * 0.1}ms"
                    >{#each paragraphOrList.items as paragraph}<li
                            >{#each paragraph.segments as segment}<SegmentHTMLView
                                    {segment}
                                    {spaces}
                                    alone={paragraph.segments.length === 1}
                                />{/each}</li
                        >{/each}</ul
                >{/if}{/each}
    {/if}
{:else}no spaces{/if}

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

    p {
        margin-inline-start: 0;
    }

    p:last-of-type {
        margin-block-end: 0em;
    }

    p:not(:first-child) {
        margin-block-start: 1em;
    }
</style>

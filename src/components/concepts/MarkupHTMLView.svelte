<svelte:options immutable />

<script lang="ts">
    import WebLink from '@nodes/WebLink';
    import Words from '@nodes/Words';
    import ConceptLink from '@nodes/ConceptLink';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import Example from '@nodes/Example';
    import ExampleUI from './ExampleUI.svelte';
    import type Spaces from '@parser/Spaces';
    import { creator } from '../../db/Creator';
    import WebLinkHTMLView from './WebLinkHTMLView.svelte';
    import WordsHTMLView from './WordsHTMLView.svelte';
    import type Markup from '../../nodes/Markup';

    export let markup: Markup;
    export let spaces: Spaces;
</script>

{#each markup.paragraphs as paragraph, index}<p
        class="paragraph"
        class:animated={$creator.getAnimationFactor() > 0}
        style="--delay:{$creator.getAnimationDuration() * index * 0.5}ms"
        >{#each paragraph.content as content}
            {#if content instanceof WebLink}<WebLinkHTMLView
                    link={content}
                    {spaces}
                />{:else if content instanceof Example}<ExampleUI
                    example={content}
                    {spaces}
                    evaluated={paragraph.content.length === 1}
                    inline={paragraph.content.length > 1}
                />{:else if content instanceof ConceptLink}<ConceptLinkUI
                    link={content}
                />{:else if content instanceof Words}<WordsHTMLView
                    words={content}
                    {spaces}
                />
            {/if}
        {/each}</p
    >{/each}

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

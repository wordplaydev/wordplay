<svelte:options immutable />

<script lang="ts">
    import WebLink from '@nodes/WebLink';
    import Words from '@nodes/Words';
    import ConceptLink from '@nodes/ConceptLink';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import Example from '@nodes/Example';
    import ExampleUI from './ExampleUI.svelte';
    import { creator } from '../../db/Creator';
    import WebLinkHTMLView from './WebLinkHTMLView.svelte';
    import WordsHTMLView from './WordsHTMLView.svelte';
    import type Markup from '../../nodes/Markup';
    import Token from '../../nodes/Token';
    import NodeRef from '../../locale/NodeRef';
    import ValueRef from '../../locale/ValueRef';
    import ValueView from '../values/ValueView.svelte';
    import ConceptRef from '../../locale/ConceptRef';
    import NodeView from '../editor/NodeView.svelte';

    export let markup: Markup;

    $: spaces = markup.spaces;
</script>

{#if spaces}
    {#each markup.paragraphs as paragraph, index}<p
            class="paragraph"
            class:animated={$creator.getAnimationFactor() > 0}
            style="--delay:{$creator.getAnimationDuration() * index * 0.5}ms"
            >{#each paragraph.segments as segment}
                {#if segment instanceof WebLink}<WebLinkHTMLView
                        link={segment}
                        {spaces}
                    />{:else if segment instanceof Example}<ExampleUI
                        example={segment}
                        {spaces}
                        evaluated={paragraph.segments.length === 1}
                        inline={paragraph.segments.length > 1}
                    />{:else if segment instanceof ConceptLink}<ConceptLinkUI
                        link={segment}
                    />{:else if segment instanceof Words}<WordsHTMLView
                        words={segment}
                        {spaces}
                    />{:else if segment instanceof NodeRef}<NodeView
                        node={segment.node}
                    />{:else if segment instanceof ValueRef}<strong
                        ><ValueView value={segment.value} /></strong
                    >{:else if segment instanceof ConceptRef}<ConceptLinkUI
                        link={segment}
                    />{:else if segment instanceof Token}{segment.getText()}
                {/if}
            {/each}</p
        >{/each}
{:else}
    missing spaces
{/if}

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

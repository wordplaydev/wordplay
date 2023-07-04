<svelte:options immutable />

<script lang="ts">
    import type Doc from '@nodes/Doc';
    import WebLink from '@nodes/WebLink';
    import Words from '@nodes/Words';
    import ConceptLink from '@nodes/ConceptLink';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import Example from '@nodes/Example';
    import ExampleUI from './ExampleUI.svelte';
    import type Spaces from '@parser/Spaces';
    import { creator } from '../../db/Creator';

    export let doc: Doc;
    export let spaces: Spaces;
</script>

{#each doc.paragraphs as paragraph, index}
    <p
        class="paragraph"
        class:animated={$creator.getAnimationFactor() > 0}
        style="--delay:{$creator.getAnimationDuration() * index * 0.5}ms"
    >
        {#each paragraph.content as content, index}
            {#if content instanceof WebLink}
                {#if content.url && content.description}
                    {#if spaces.getSpace(content.open).length > 0}&nbsp;{/if}<a
                        href={content.url.getText()}
                        target="_blank"
                        rel="noreferrer">{content.description.getText()}</a
                    >
                {:else if content.description}
                    {content.description.getText()}
                {/if}
            {:else if content instanceof Example}
                <ExampleUI
                    example={content}
                    {spaces}
                    evaluated={paragraph.content.length === 1}
                />
            {:else if content instanceof ConceptLink}
                <ConceptLinkUI link={content} />
            {:else if content instanceof Words && content.words}
                {#if index > 0 && spaces && spaces.getSpace(content.words).length > 0}&nbsp;{/if}<span
                    class:italic={content.isItalic()}
                    class:bold={content.isBold()}
                    class:extra={content.isExtra()}>{content.getText()}</span
                >
            {/if}
        {/each}
    </p>
{/each}

<style>
    .italic {
        font-style: italic;
    }
    .bold {
        font-weight: bold;
    }
    .extra {
        font-weight: 700;
    }

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

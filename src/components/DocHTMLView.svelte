<svelte:options immutable />

<script lang="ts">
    import type Doc from '../nodes/Doc';
    import WebLink from '../nodes/WebLink';
    import Words from '../nodes/Words';
    import { project } from '../models/stores';
    import ConceptLink from '../nodes/ConceptLink';
    import ConceptLinkUI from './ConceptLinkUI.svelte';

    export let doc: Doc;

    // See if there are spaces defined for this.
    $: spaces = $project.getSourceOf(doc)?.getSpaces();
</script>

{#each doc.paragraphs as paragraph}
    <p>
        {#each paragraph.content as content}
            {#if content instanceof WebLink}
                {#if content.url && content.description}
                    {#if spaces && spaces.getSpace(content.open).length > 0}&nbsp;{/if}<a
                        href={content.url.getText()}
                        target="_blank"
                        rel="noreferrer">{content.description.getText()}</a
                    >
                {:else if content.description}
                    {content.description}
                {/if}
            {:else if content instanceof ConceptLink}
                <ConceptLinkUI link={content} />
            {:else if content instanceof Words && content.words}
                {#if spaces && spaces.getSpace(content.words).length > 0}&nbsp;{/if}<span
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
</style>

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

    export let doc: Doc;
    export let spaces: Spaces;
</script>

{#each doc.paragraphs as paragraph}
    <p>
        {#each paragraph.content as content, index}
            {#if content instanceof WebLink}
                {#if content.url && content.description}
                    {#if spaces.getSpace(content.open).length > 0}&nbsp;{/if}<a
                        href={content.url.getText()}
                        target="_blank"
                        rel="noreferrer">{content.description.getText()}</a
                    >
                {:else if content.description}
                    {content.description}
                {/if}
            {:else if content instanceof Example}
                <ExampleUI example={content} {spaces} />
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
</style>

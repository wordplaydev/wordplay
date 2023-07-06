<script lang="ts">
    import ConceptLink from '../../nodes/ConceptLink';
    import Token from '../../nodes/Token';
    import WebLink from '../../nodes/WebLink';
    import type Words from '../../nodes/Words';
    import type Spaces from '../../parser/Spaces';
    import WebLinkHTMLView from './WebLinkHTMLView.svelte';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import Example from '../../nodes/Example';
    import ExampleUI from './ExampleUI.svelte';

    export let words: Words;
    export let spaces: Spaces;
</script>

<span class={words.getFormat()}>
    {#each words.segments as segment, index}
        {#if segment instanceof WebLink}<WebLinkHTMLView
                link={segment}
                {spaces}
            />
        {:else if segment instanceof ConceptLink}<ConceptLinkUI
                link={segment}
            />
        {:else if segment instanceof Example}<ExampleUI
                example={segment}
                {spaces}
                evaluated={false}
                inline={true}
            />
        {:else if segment instanceof Token}{#if index > 0 && spaces && spaces.getSpace(segment).length > 0}&nbsp;{/if}{segment.getText()}
        {/if}
    {/each}</span
>

<style>
    .italic {
        font-style: italic;
    }
    .underline {
        text-decoration: underline;
    }
    .light {
        font-weight: 300;
    }
    .bold {
        font-weight: bold;
    }
    .extra {
        font-weight: 700;
    }
</style>

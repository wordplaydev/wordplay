<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import type HowConcept from '@concepts/HowConcept';
    import { locales } from '@db/Database';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import MarkupHTMLView from './MarkupHTMLView.svelte';

    interface Props {
        concept: HowConcept;
    }

    let { concept }: Props = $props();
</script>

<Subheader>{concept.how.title}</Subheader>

<Speech below character={concept.getCharacter($locales)}>
    {#snippet content()}
        {@const markup = concept.getDocs()[0]}
        {#if markup}
            <MarkupHTMLView {markup} />
        {:else}
            {$locales.concretize((l) => l.ui.docs.nodoc)}
        {/if}
    {/snippet}
</Speech>

{#if concept.how.related.length > 0}
    <Subheader text={(l) => l.ui.docs.how.related} />
    <ul>
        {#each concept.how.related as related}
            <li><ConceptLinkUI link="how/{related}" /></li>
        {/each}
    </ul>
{/if}

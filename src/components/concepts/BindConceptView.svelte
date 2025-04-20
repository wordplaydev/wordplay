<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type BindConcept from '@concepts/BindConcept';
    import { blocks, locales } from '@db/Database';
    import Speech from '../lore/Speech.svelte';
    import RootView from '../project/RootView.svelte';
    import MarkupHTMLView from './MarkupHTMLView.svelte';

    interface Props {
        concept: BindConcept;
    }

    let { concept }: Props = $props();
</script>

<Speech character={concept.getCharacter($locales)} below={true}>
    {#snippet content()}
        {@const markup = concept.getDocs($locales)[0]}
        {#if markup}
            <MarkupHTMLView {markup} />
        {:else}
            <LocalizedText path={(l) => l.ui.docs.nodoc} />
        {/if}
    {/snippet}
    {#snippet aside()}
        {#if concept.bind.type}•<RootView
                node={concept.bind.type}
                inline
                locale="symbolic"
                blocks={$blocks}
            />{/if}{#if concept.bind.value}: <RootView
                node={concept.bind.value}
                inline
                locale="symbolic"
                blocks={$blocks}
            />{/if}
    {/snippet}
</Speech>

<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '@concepts/Concept';
    import CodeView from './CodeView.svelte';
    import MarkupHTMLView from './MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import { animationDuration, locale, locales } from '../../db/Database';
    import type Type from '../../nodes/Type';
    import concretize from '../../locale/concretize';
    import type TypeVariables from '../../nodes/TypeVariables';
    import RootView from '../project/RootView.svelte';

    export let concept: Concept;
    export let type: Type | undefined = undefined;
    export let header = true;
    export let variables: TypeVariables | undefined = undefined;

    $: node = concept.getRepresentation();
</script>

<div class="concept" transition:slide|local={{ duration: $animationDuration }}>
    {#if header}
        <CodeView {concept} {type} {node} describe={false} />
    {/if}

    <Speech glyph={concept.getGlyphs($locales)} below={header}>
        <svelte:fragment slot="content">
            {@const markup = concept.getDocs($locale)}
            {#if markup}
                <MarkupHTMLView {markup} />
            {:else}
                {concretize($locale, $locale.ui.labels.nodoc)}
            {/if}
        </svelte:fragment>
        <svelte:fragment slot="aside"
            >{#if variables}{#each variables.variables as variable, index}{#if index > 0},
                    {/if}{@const name =
                        variable.names.getPreferredName(
                            $locale
                        )}{#if name}<RootView
                            localized
                            node={name.withoutLanguage()}
                        />{/if}{/each}{/if}</svelte:fragment
        >
    </Speech>

    <slot />
</div>

<style>
    .concept {
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
    }
</style>

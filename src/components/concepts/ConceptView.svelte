<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '@concepts/Concept';
    import CodeView from './CodeView.svelte';
    import MarkupHTMLView from './MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import { Locales, animationDuration, locales } from '../../db/Database';
    import type Type from '../../nodes/Type';
    import concretize from '../../locale/concretize';
    import type TypeVariables from '../../nodes/TypeVariables';
    import RootView from '../project/RootView.svelte';
    import type Locale from '../../locale/Locale';
    import Progress from '../../tutorial/Progress';
    import Link from '../app/Link.svelte';

    export let concept: Concept;
    export let type: Type | undefined = undefined;
    export let header = true;
    export let variables: TypeVariables | undefined = undefined;

    $: node = concept.getRepresentation();

    /** See if the concept corresponds to a character name, and find that character name in the locale's tutorial. */
    let tutorialURL: string | undefined = undefined;
    $: getConceptURL($locales.getLocale()).then((url) => (tutorialURL = url));

    async function getConceptURL(locale: Locale) {
        const character = concept.getCharacter($locales);
        if (character) {
            const tutorial = await Locales.getTutorial(
                locale.language,
                locale.region
            );
            if (tutorial) {
                for (const [actIndex, act] of tutorial.acts.entries()) {
                    for (const [sceneIndex, scene] of act.scenes.entries()) {
                        if (scene.concept === character) {
                            return new Progress(
                                tutorial,
                                actIndex + 1,
                                sceneIndex + 1,
                                0
                            ).getURL();
                        }
                    }
                }
            }
        }

        return undefined;
    }
</script>

<div class="concept" transition:slide|local={{ duration: $animationDuration }}>
    {#if header}
        <CodeView {concept} {type} {node} describe={false} />
        {#if tutorialURL}
            <Link external to={tutorialURL}
                >{$locales.get((l) => l.ui.docs.learn)}</Link
            >
        {/if}
    {/if}

    <Speech glyph={concept.getGlyphs($locales)} below={header}>
        <svelte:fragment slot="content">
            {@const markup = concept.getDocs($locales)}
            {#if markup}
                <MarkupHTMLView {markup} />
            {:else}
                {concretize(
                    $locales,
                    $locales.get((l) => l.ui.docs.nodoc)
                )}
            {/if}
        </svelte:fragment>
        <svelte:fragment slot="aside"
            >{#if variables}{#each variables.variables as variable, index}{#if index > 0},
                    {/if}{@const name = variable.names.getPreferredName(
                        $locales.getLocales()
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

<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import PeekingBackground from '@components/app/PeekingBackground.svelte';
    import Characters from '../../lore/BasisCharacters';
    import { getTutorialCharacterSymbols } from './backgroundUtils';
    import type { TutorialMode } from '../../tutorial/TutorialMode';

    interface Props {
        /** Called with the chosen tutorial mode. */
        onChoose: (mode: TutorialMode) => void;
        /** Called when the creator picks the Guide instead of a tutorial. */
        onGuide: () => void;
    }

    let { onChoose, onGuide }: Props = $props();
</script>

<div class="choice">
    <PeekingBackground symbols={getTutorialCharacterSymbols()} />
    <Header block={false} text={(l) => l.ui.page.learn.header} />
    <Speech character={Characters.FunctionDefinition} scroll={false}>
        {#snippet content()}
            <LocalizedText path={(l) => l.ui.page.learn.choice.prompt} />
        {/snippet}
    </Speech>
    <div class="options">
        <button class="card" type="button" onclick={() => onChoose('quick')}>
            <Subheader compact
                ><LocalizedText
                    path={(l) => l.ui.page.learn.choice.quick.title}
                /></Subheader
            >
            <span class="description"
                ><LocalizedText
                    path={(l) => l.ui.page.learn.choice.quick.description}
                /></span
            >
        </button>
        <button class="card" type="button" onclick={() => onChoose('complete')}>
            <Subheader compact
                ><LocalizedText
                    path={(l) => l.ui.page.learn.choice.complete.title}
                /></Subheader
            >
            <span class="description"
                ><LocalizedText
                    path={(l) => l.ui.page.learn.choice.complete.description}
                /></span
            >
        </button>
        <button class="card" type="button" onclick={onGuide}>
            <Subheader compact
                ><LocalizedText
                    path={(l) => l.ui.page.guide.header}
                /></Subheader
            >
            <span class="description"
                ><LocalizedText
                    path={(l) => l.ui.page.landing.link.guide}
                /></span
            >
        </button>
    </div>
</div>

<style>
    .choice {
        /* Positioning context for the peeking background (absolute, z-index -1). */
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: calc(2 * var(--wordplay-spacing));
        /* Fill the page so align-items centers the cards across the full width, not just the
           content box. */
        width: 100%;
        min-height: 100%;
        padding: var(--wordplay-spacing);
        text-align: center;
    }

    .options {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: stretch;
        justify-content: center;
        gap: var(--wordplay-spacing);
    }

    .card {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        inline-size: 16em;
        max-inline-size: 90vw;
        padding: calc(2 * var(--wordplay-spacing));
        text-align: start;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        /* Elevated card look matching the standard background button. */
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        cursor: pointer;
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-font-size);
        transition:
            transform calc(var(--animation-factor) * 50ms),
            box-shadow calc(var(--animation-factor) * 50ms),
            background-color calc(var(--animation-factor) * 50ms);
    }

    /* Standard button hover/focus feedback. */
    .card:hover,
    .card:focus {
        background: var(--wordplay-hover);
        /* Keep nested links legible on the gold hover background (#1216). */
        --wordplay-link-color: var(--color-white);
        --wordplay-link-underline-color: var(--color-orange);
        box-shadow: calc(2 * var(--wordplay-border-width))
            calc(2 * var(--wordplay-border-width)) 0
            var(--wordplay-border-color);
        transform: translate(-1px, -1px);
        outline: none;
    }

    .card:active {
        box-shadow: none;
        transform: translate(
            var(--wordplay-border-width),
            var(--wordplay-border-width)
        );
    }

    .card:focus-visible {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
    }

    .description {
        color: var(--wordplay-foreground);
    }
</style>

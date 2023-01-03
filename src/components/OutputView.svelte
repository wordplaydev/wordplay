<script lang="ts">
    import { selectTranslation } from '../nodes/Translations';
    import { toVerse } from '../output/Verse';
    import Exception from '../runtime/Exception';
    import type Value from '../runtime/Value';
    import { languages } from '../models/languages';
    import { playing } from '../models/stores';
    import KeyboardIdle from '../editor/util/KeyboardIdle';
    import type Project from '../models/Project';
    import ValueView from './ValueView.svelte';
    import type Source from '../nodes/Source';
    import VerseView from './VerseView.svelte';
    import { createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';

    export let project: Project;
    export let source: Source;
    export let latest: Value | undefined;
    export let mode: 'mini' | 'peripheral' | 'fullscreen';

    let active = false;

    const dispatch = createEventDispatcher<{ fullscreen: { on: boolean } }>();

    $: verse = latest === undefined ? undefined : toVerse(latest);

    function activate() {
        if (mode === 'peripheral') active = true;
    }
    function deactivate() {
        if (mode === 'peripheral') active = false;
    }

    function maximize() {
        dispatch('fullscreen', { on: !(mode === 'fullscreen') });
    }
</script>

<section
    class={`output ${mode}`}
    class:active
    class:mode
    on:focusin={activate}
    on:focusout={deactivate}
    transition:slide
>
    <div
        class="verse"
        style={verse !== undefined
            ? `background-color: ${verse.background.toCSS()};`
            : undefined}
    >
        <!-- If there's an exception, show that. -->
        {#if latest instanceof Exception}
            <div class="fill exception"
                ><div class="message"
                    >{selectTranslation(
                        latest.getExplanations(),
                        $languages
                    )}</div
                ></div
            >
            <!-- If there's no verse -->
        {:else if latest === undefined}
            <!-- If it's because the keyboard isn't idle, show the typing feedback.-->
            {#if $playing && !$KeyboardIdle}
                <div class="fill editing"><div class="message">⌨️</div></div>
            {:else}
                <div class="fill evaluating"><div class="message">...</div></div
                >
            {/if}
            <!-- If there's a value, but it's not a verse, show that -->
        {:else if verse === undefined}
            <div class="fill value">
                <div class="message">
                    <h2
                        >{selectTranslation(
                            latest
                                .getType(project.getContext(source))
                                .getDescriptions(project.getContext(source)),
                            $languages
                        )}</h2
                    >
                    <p><ValueView value={latest} /></p>
                </div>
            </div>
            <!-- Otherwise, show the Verse -->
        {:else}
            <VerseView
                {project}
                {verse}
                interactive={mode !== 'mini' && source === project.main}
            />
        {/if}
    </div>
    {#if mode !== 'mini'}
        <!-- A few buttons for minimize and maximize -->
        <div
            class="maximize"
            on:click={maximize}
            tabIndex="0"
            on:keydown={(event) =>
                event.key === 'Enter' || event.key === ' '
                    ? maximize()
                    : undefined}
        >
            <svg width="100%" height="100%" version="1.1" viewBox="0 0 36 36">
                <path d="m 10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 0,0 z" />
                <path d="m 20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 0,0 z" />
                <path d="m 24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 0,0 z" />
                <path d="M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 0,0 z" />
            </svg>
        </div>
    {/if}
</section>

<style>
    .output {
        transition: ease-in, width 0.25s ease-in, height 0.25s ease-in;
        transform-origin: top right;

        background-color: var(--wordplay-background);

        overflow: hidden;
        z-index: var(--wordplay-layer-output);

        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    .fullscreen {
        position: fixed;
        width: 100vw;
        height: 100vh;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: var(--wordplay-layer-fullscreen);
    }

    .fullscreen .verse {
        width: 100%;
        height: 100%;
    }

    .verse {
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        flex: 1;
        width: 100%;
        min-height: 2em;
    }

    .mini {
        position: static;
        width: 3em;
        height: 3em;
        box-shadow: none;
        background-color: var(--wordplay-background);
        transform-origin: center;
        z-index: 1;
    }

    .fill {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .fill .message {
        width: 100%;
        height: auto;
        padding: var(--wordplay-spacing);
        text-align: center;
        line-height: 100%;
        font-size: 48pt;
        transform-origin: center;
    }

    .editing .message {
        animation: jiggle 0.2s ease-out infinite;
    }

    @keyframes jiggle {
        0% {
            transform: rotate(-4deg) translate(0, 0);
        }
        25% {
            transform: rotate(6deg) translate(0, -1px);
        }
        50% {
            transform: rotate(-8deg) translate(0, 2px);
        }
        75% {
            transform: rotate(-2deg) translate(0, -4px);
        }
        100% {
            transform: rotate(4deg) translate(0, 1px);
        }
    }

    .exception {
        color: var(--wordplay-background);
        background-color: var(--wordplay-error);
    }

    .exception .message {
        animation: shake 0.1s 3;
    }

    .verse:focus-within {
        outline: var(--wordplay-highlight) solid var(--wordplay-border-width);
        outline-offset: calc(-1 * var(--wordplay-border-width));
        z-index: 2;
    }

    .maximize {
        position: absolute;
        top: var(--wordplay-spacing);
        right: var(--wordplay-spacing);
        width: 2em;
        height: 2em;
        z-index: var(--wordplay-layer-fullscreen);
        fill: var(--wordplay-disabled-color);
    }

    .maximize:hover {
        fill: var(--wordplay-background);
        cursor: pointer;
        transform: scale(1.2);
    }

    .maximize:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-border-width);
    }
</style>

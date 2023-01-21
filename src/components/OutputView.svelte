<script lang="ts">
    import { toVerse } from '../output/Verse';
    import Exception from '../runtime/Exception';
    import type Value from '../runtime/Value';
    import { playing } from '../models/stores';
    import KeyboardIdle from '../editor/util/KeyboardIdle';
    import type Project from '../models/Project';
    import ValueView from './ValueView.svelte';
    import type Source from '../nodes/Source';
    import VerseView from './VerseView.svelte';
    import DescriptionView from './DescriptionView.svelte';
    import {
        preferredTranslations,
        writingDirection,
        writingLayout,
    } from '../translation/translations';
    import Timeline from './Timeline.svelte';

    export let project: Project;
    export let source: Source;
    export let latest: Value | undefined;
    export let mode: 'mini' | 'peripheral' | 'fullscreen';
    export let background: string | null = null;

    $: verse = latest === undefined ? undefined : toVerse(latest);
    $: background = verse?.background.toCSS() ?? null;
</script>

<section
    class={`output ${mode}`}
    class:mode
    style:direction={$writingDirection}
    style:writing-mode={$writingLayout}
>
    <!-- Render the verse, or whatever value we get -->
    <div class="value">
        <!-- If there's an exception, show that. -->
        {#if latest instanceof Exception}
            <div class="fill exception"
                ><div class="message"
                    >{#each $preferredTranslations as translation}
                        <DescriptionView
                            description={latest.getDescription(translation)}
                        />
                    {/each}
                </div></div
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
                        >{$preferredTranslations.map((translation) =>
                            latest === undefined
                                ? undefined
                                : latest
                                      .getType(project.getContext(source))
                                      .getDescription(
                                          translation,
                                          project.getContext(source)
                                      )
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
                editable={mode === 'peripheral' && $playing}
            />
        {/if}
    </div>
    {#if mode !== 'mini'}
        <Timeline evaluator={project.evaluator} />
    {/if}
</section>

<style>
    .output {
        transition: ease-in, width 0.25s ease-in, height 0.25s ease-in;
        transform-origin: top right;

        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        position: relative;

        width: 100%;
        height: 100%;
    }

    .fullscreen .value {
        width: 100%;
        height: 100%;
    }

    .value {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
        width: 100%;
    }

    .mini {
        position: static;
        width: 2em;
        height: 2em;
        box-shadow: none;
        background-color: var(--wordplay-background);
        transform-origin: center;
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
</style>

<script lang="ts">
    import { selectTranslation } from "../nodes/Translations";
    import { toVerse } from "../output/Verse";
    import Exception from "../runtime/Exception";
    import type Value from "../runtime/Value";
    import { languages } from "../models/languages";
    import { playing } from '../models/stores';
    import KeyboardIdle from "../models/KeyboardIdle";
    import type Project from "../models/Project";
    import ValueView from "./ValueView.svelte";
    import type Source from "../models/Source";
    import VerseView from "./VerseView.svelte";
    import Timeline from "./Timeline.svelte";
    import { createEventDispatcher } from "svelte";

    export let project: Project;
    export let source: Source;
    export let latest: Value | undefined;
    export let mode: "mini" | "peripheral" | "fullscreen";

    let active = false;

    const dispatch = createEventDispatcher<{ fullscreen: { on: boolean }}>();

    $: verse = latest === undefined ? undefined : toVerse(latest);

    function activate() { if(mode === "peripheral") active = true; }
    function deactivate() { if(mode === "peripheral") active = false; }

    function maximize() {
        dispatch("fullscreen", { on: !(mode === "fullscreen") });
    }

</script>

<section 
    class={`overlay ${mode}`}
    class:active
    class:mode={mode}
    tabIndex=0
    on:focusin={activate}
    on:focusout={deactivate}
>
    <div 
        class="output" 
        style="{verse !== undefined ? `background-color: ${verse.background.toCSS()};` : undefined}"
    >
        <!-- If there's an exception, show that. -->
        {#if latest instanceof Exception}
            <div class="fill exception"><div class='message'>{selectTranslation(latest.getExplanations(), $languages)}</div></div>
        <!-- If there's no verse -->
        {:else if latest === undefined}
            <!-- If it's because the keyboard isn't idle, show the typing feedback.-->
            {#if $playing && !$KeyboardIdle}
                <div class="fill editing"><div class='message'>⌨️</div></div>
            {:else}
                <div class="fill evaluating"><div class='message'>...</div></div>
            {/if}
        <!-- If there's a value, but it's not a verse, show that -->
        {:else if verse === undefined}
            <div class="fill value">
                <div class='message'>
                    <h2>{selectTranslation(latest.getType(project.getContext(source)).getDescriptions(project.getContext(source)), $languages)}</h2>
                    <p><ValueView value={latest}/></p>
                </div>
            </div>
        <!-- Otherwise, show the Verse -->
        {:else}
            <VerseView {project} {verse} interactive={source === project.main}/>
        {/if}
    </div>
    {#if active && mode !== "fullscreen" && source === project.main}
        <Timeline evaluator={project.evaluator} />
    {/if}
    {#if mode !== "mini" }
        <!-- A few buttons for minimize and maximize -->
        <div class="maximize" on:click={maximize} tabIndex=0 on:keydown={event => event.key === "Enter" || event.key === " " ? maximize() : undefined }>
            <svg width="100%" height="100%" version="1.1" viewBox="0 0 36 36">
                <path d="m 10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 0,0 z"></path>
                <path d="m 20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 0,0 z"></path>
                <path d="m 24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 0,0 z"></path>
                <path d="M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 0,0 z"></path>
                </svg>
        </div>
    {/if}
</section>

<style>
    .overlay {
        position: fixed;
        top: var(--wordplay-spacing);
        right: var(--wordplay-spacing);
        z-index: 3;
        transition: transform 0.25s ease-in, width 0.25s ease-in, height 0.25s ease-in;

        transform-origin: top right;
        box-shadow: -2px calc(var(--wordplay-border-width)) calc(2 * var(--wordplay-border-width)) rgba(0,0,0,.2);

        display: flex;
        flex-direction: column;
        background-color: var(--wordplay-background);
        
        border-radius: var(--wordplay-border-radius);
        overflow: hidden;
    }

    .peripheral {
        transform: scale(0.3);
    }

    .peripheral.active {
        transform: scale(1);
    }

    .fullscreen {
        width: 100vw;
        height: 100vh;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
    }

    .fullscreen .output {
        width: 100%;
        height: 100%;
    }

    .output {
        width: 40em;
        height: 40em;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
    }

    .mini {
        position: static;
        width: 5em;
        height: 5em;
        box-shadow: none;
        background-color: var(--wordplay-background);
        transform-origin: center;
        z-index: 0;
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
        0% { transform: rotate(-4deg) translate(0, 0); }
        25% { transform: rotate(6deg) translate(0, -1px); }
        50% { transform: rotate(-8deg) translate(0, 2px); }
        75% { transform: rotate(-2deg) translate(0, -4px); }
        100% { transform: rotate(4deg) translate(0, 1px); }
    }

    .exception {
        color: var(--wordplay-background);
        background-color: var(--wordplay-error);
    }

    .exception .message {
        animation: shake .1s 3;
    }

    .output:focus-within {
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
        z-index: 3;
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

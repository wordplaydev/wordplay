<script lang="ts">
    import { getLanguages } from '../editor/util/Contexts';
    import { examples, makeProject, type Stuff } from '../examples/examples';
    import { project, playing, updateProject } from '../models/stores';
    import type LanguageCode from '../nodes/LanguageCode';
    import { languageCodeToLanguage, SupportedLanguages } from '../nodes/LanguageCode';
    import { WRITE } from '../nodes/Translations';
    import Button from './Button.svelte';
    import Switch from './Switch.svelte';

    let example: Stuff;
    let language: LanguageCode;
    let languages = getLanguages();

    function changeProject() {
        updateProject(makeProject(example));
    }

    function changeLanguage() {
        languages.set([language]);
    }

    function reset() {
        updateProject($project.clone());
    }

    function handleStep() {
        $project.evaluator.stepWithinProgram();
    }

    function handleStepOut() {
        $project.evaluator.stepOut();
    }

    function playPause() {
        if($project.evaluator.isStepping()) $project.evaluator.play();
        else $project.evaluator.pause();
    }

</script>

<div class="header">
    <h1>Wordplay</h1>
    <select bind:value={example} on:change={changeProject}>
        {#each examples as example }
            <option value={example}>{example.name}</option>
        {/each}
    </select>
    <select bind:value={language} on:change={changeLanguage}>
        {#each SupportedLanguages as lang }
            <option value={lang}>{languageCodeToLanguage[lang]}</option>
        {/each}
    </select>
    <Button
        label={{ eng: "restart", "😀": WRITE }}
        tip={{ eng: "Restart the evaluation of the project from the beginning.", "😀": WRITE }}
        action={reset}
    />
    <!-- If it's output, show controls -->
    <Switch 
        on={$playing}
        toggle={playPause} 
        offTip={{ eng: "Evaluate the program one step at a time", "😀": WRITE }}
        onTip={{ eng: "Evaluate the program fully", "😀": WRITE }}
        offLabel={{ eng: "pause", "😀": WRITE }}
        onLabel={{ eng: "play", "😀": WRITE }}
    />
    {#if $playing}
        <Button 
            label={{ eng: "→", "😀": WRITE }}
            tip={{ eng: "Advance one step in the program's evaluation.", "😀": WRITE }}
            action={handleStep} 
            enabled={!$project.evaluator.isPlaying() && !$project.evaluator.isDone()} 
        />
        <Button 
            label={{ eng: "↑", "😀": WRITE }}
            tip={{ eng: "Step out of this function.", "😀": WRITE }}
            action={handleStepOut} 
            enabled={!$project.evaluator.isPlaying() && !$project.evaluator.isDone()}
        />
        <Button 
            label={{ eng: "→ in", "😀": WRITE }}
            tip={{ eng: "Step to the next input.", "😀": WRITE }}
            action={() => $project.evaluator.stepToInput()} 
        />
        <Button
            label={{ eng: "←", "😀": WRITE }}
            tip={{ eng: "Step back one step.", "😀": WRITE }}
            action={() => $project.evaluator.stepBackWithinProgram() }
            enabled={!$project.evaluator.isAtBeginning()}
        />
        <Button
            label={{ eng: "← in", "😀": WRITE }}
            tip={{ eng: "Step to previous input.", "😀": WRITE }}
            action={() => $project.evaluator.stepBackToInput() }
            enabled={!$project.evaluator.isAtBeginning()}
        />
    {/if}

</div>

<style>
    .header {
        height: auto;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        background: var(--wordplay-chrome);
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        box-sizing: border-box;
    }

    h1 {
        display: inline;
    }

</style>
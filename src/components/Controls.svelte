<script lang="ts">
    import { WRITE } from '../nodes/Translations';
    import {
        playing,
        updateProject,
        streams,
        currentStep,
        currentStepIndex,
    } from '../models/stores';

    import Button from './Button.svelte';
    import Switch from './Switch.svelte';
    import type Project from '../models/Project';

    export let project: Project;

    function reset() {
        updateProject(project.clone());
    }

    function handleStep() {
        project.evaluator.stepWithinProgram();
    }

    function handleStepOut() {
        project.evaluator.stepOut();
    }

    function playPause(play: boolean) {
        if (play) project.evaluator.play();
        else project.evaluator.pause();
    }
</script>

<section class="controls">
    <Button
        label={{ eng: '↻', '😀': WRITE }}
        tip={{
            eng: 'Restart the evaluation of the project from the beginning.',
            '😀': WRITE,
        }}
        action={reset}
        enabled={$streams.length > 1}
    />
    <Switch
        on={$playing}
        toggle={playPause}
        offTip={{ eng: 'Evaluate the program one step at a time', '😀': WRITE }}
        onTip={{ eng: 'Evaluate the program fully', '😀': WRITE }}
        offLabel={{ eng: '||', '😀': WRITE }}
        onLabel={{ eng: '▷', '😀': WRITE }}
    />
    {#if !$playing}
        <Button
            label={{ eng: '←', '😀': WRITE }}
            tip={{ eng: 'Step back one step.', '😀': WRITE }}
            action={() => project.evaluator.stepBackWithinProgram()}
            enabled={!$playing && !project.evaluator.isAtBeginning()}
        />
        <Button
            label={{ eng: '↑', '😀': WRITE }}
            tip={{ eng: 'Step out of this function.', '😀': WRITE }}
            action={handleStepOut}
            enabled={!$playing &&
                $currentStep &&
                project.evaluator.getCurrentEvaluation() !== undefined}
        />
        <Button
            label={{ eng: '→', '😀': WRITE }}
            tip={{
                eng: "Advance one step in the program's evaluation.",
                '😀': WRITE,
            }}
            action={handleStep}
            enabled={!$playing &&
                $currentStepIndex < project.evaluator.getStepCount()}
        />
        <Button
            label={{ eng: '⇥', '😀': WRITE }}
            tip={{ eng: 'Advance to the present.', '😀': WRITE }}
            action={() => project.evaluator.play()}
            enabled={$streams.length > 1}
        />
    {/if}
</section>

<style>
    .controls {
        white-space: nowrap;
    }
</style>

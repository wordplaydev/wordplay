<script lang="ts">
    import { toClipboard } from '@components/editor/commands/Clipboard';
    import Button from '@components/widgets/Button.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Project from '@db/projects/Project';
    import type Caret from '@edit/caret/Caret';
    import Example from '@nodes/Example';
    import Source from '@nodes/Source';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import type Spaces from '@parser/Spaces';
    import {
        BLOCK_EDITING_SYMBOL,
        CONFIRM_SYMBOL,
        COPY_SYMBOL,
        TEXT_EDITING_SYMBOL,
    } from '@parser/Symbols';
    import Evaluator from '@runtime/Evaluator';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { blocks, DB, locales, Settings } from '../../db/Database';
    import Stage, { NameGenerator, toStage } from '../../output/Stage';
    import type Value from '../../values/Value';
    import Annotations from '../annotations/Annotations.svelte';
    import Editor from '../editor/Editor.svelte';
    import OutputView from '../output/OutputView.svelte';
    import {
        getConceptIndex,
        setConflicts,
        setProject,
    } from '../project/Contexts';
    import ValueView from '../values/ValueView.svelte';

    interface Props {
        example: Example;
        spaces: Spaces;
        /** True if this example should show it's value. */
        evaluated: boolean;
    }

    let { example, spaces, evaluated }: Props = $props();

    let value: Value | undefined = $state(undefined);
    let stage: Stage | undefined = $state(undefined);
    let evaluator: Evaluator | undefined = $state();
    let copied = $state(false);
    let currentCaret: Caret | undefined = $state(undefined);
    let annotationsExpanded = $state(false);

    function update() {
        if (evaluator && project) {
            value = evaluator.getLatestSourceValue(project.getMain());
            stage = value
                ? toStage(evaluator, value, new NameGenerator())
                : undefined;
        }
    }

    onMount(() => {
        return () => {
            // Remove the example from the index. We guard here because of a Svelte bug, which seems to change the prop to something else.
            if (example instanceof Example)
                index?.removeExample(example.program.expression);
            if (evaluator) {
                evaluator.stop();
                evaluator.ignore(update);
            }
        };
    });

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    // Keep track of the last example so we can remove it when the example changes.
    // svelte-ignore state_referenced_locally
    let lastExample = $state(example);

    // Derive a project from the example.
    let project = $derived<Project | undefined>(
        Project.make(
            null,
            'example',
            new Source('example', [example.program, spaces]),
            [],
            $locales.getLocales(),
        ),
    );

    // Set a project context so we can do analysis and localization in the code example.
    let projectStore = writable<Project | undefined>(undefined);
    setProject(projectStore);
    $effect(() => {
        projectStore.set(project);
    });

    // Provide a conflicts context so the Editor can show conflict annotations.
    const conflictsStore = writable<
        ReturnType<Project['analyze']>['conflicts']
    >([]);
    setConflicts(conflictsStore);
    $effect(() => {
        conflictsStore.set(project ? project.analyze().conflicts : []);
    });

    function reset(hard: boolean) {
        // Don't create a new evaluator if the project is the same.
        if (!hard && evaluator && evaluator.project === project) return;

        evaluator?.ignore(update);

        if (project) {
            evaluator = new Evaluator(project, DB, $locales.getLocales());
            if (evaluated) evaluator.observe(update);
            evaluator.start();
        } else {
            evaluator = undefined;
        }
    }

    /** Reset when the project changes */
    $effect(() => {
        if (project) reset(false);
    });

    /** Add the example to the index when it changes so it can be dragged */
    $effect(() => {
        if (index && lastExample !== example) {
            if (lastExample) {
                index.removeExample(lastExample.program.expression);
            }
            lastExample = example;
            index.addExample(example.program.expression);
        }
    });
</script>

<div class="container">
    <div class="example">
        <div class="code-panel" class:evaluated>
            <div class="code-row">
                <div class="code">
                    {#if project && evaluator}
                        <Editor
                            source={project.getMain()}
                            {project}
                            locale={$locales.getLocale()}
                            {evaluator}
                            editable={false}
                            bind:caretSnapshot={currentCaret}
                        />
                    {/if}
                </div>
                {#if project}
                    <Annotations
                        {project}
                        {evaluator}
                        source={project.getMain()}
                        sourceID=""
                        stepping={false}
                        conflicts={$conflictsStore}
                        caret={currentCaret}
                        expanded={annotationsExpanded}
                        onToggle={() =>
                            (annotationsExpanded = !annotationsExpanded)}
                    />
                {/if}
            </div>
            <div class="tools">
                <Button
                    tip={(l) => l.ui.project.button.copy.tip}
                    action={() => {
                        copied = true;
                        toClipboard(
                            example.program.toWordplay(
                                getPreferredSpaces(example.program),
                            ),
                        );
                        setTimeout(() => (copied = false), 1000);
                    }}
                    icon={COPY_SYMBOL}
                    background={true}
                >
                    {#if copied}{CONFIRM_SYMBOL}{/if}</Button
                >

                <Mode
                    icons={[TEXT_EDITING_SYMBOL, BLOCK_EDITING_SYMBOL]}
                    modes={(l) => l.ui.dialog.settings.mode.blocks}
                    choice={$blocks ? 1 : 0}
                    select={(mode) => Settings.setBlocks(mode === 1)}
                    labeled={false}
                    modeLabels={false}
                />
            </div>
        </div>
        {#if evaluated && value}
            <div class="value">
                {#if stage && evaluator && project}
                    <div class="stage">
                        <OutputView
                            {project}
                            {evaluator}
                            {value}
                            grid
                            editable={false}
                            wheel={false}
                        />
                    </div>
                {:else}<ValueView {value} inline={false} />{/if}
                <div class="reset">
                    <Button
                        tip={(l) => l.ui.timeline.button.reset}
                        icon="↻"
                        background={true}
                        action={() => reset(true)}
                    ></Button>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        container-type: inline-size;
    }

    .value {
        flex-grow: 1;
        max-width: 30em;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .reset {
        display: flex;
        justify-content: center;
    }

    .example {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        gap: var(--wordplay-spacing);
    }

    @container (max-width: 30em) {
        .example {
            flex-direction: column;
        }

        .value {
            max-width: none;
        }
    }

    .code-panel {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .code-panel.evaluated {
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-top: none;
        overflow: hidden;
    }

    .code-row {
        border-radius: var(--wordplay-border-radius);
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-bottom: none;
        display: flex;
        flex-direction: row;
        align-items: stretch;
    }

    .code {
        min-width: 0;
    }

    .code-panel.evaluated .code {
        padding: var(--wordplay-spacing);
        overflow: auto;
        white-space: nowrap;
    }

    /* Allow iOS horizontal scroll by overriding the touch-action: none set deep in CodeView */
    .code-panel.evaluated :global(.view),
    .code-panel.evaluated :global(.node) {
        touch-action: pan-x;
    }

    .stage {
        display: flex;
        min-width: 10em;
        width: 100%;
        aspect-ratio: 4/3;
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .tools {
        display: flex;
        flex-direction: row;
        justify-content: start;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }
</style>

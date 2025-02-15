<script lang="ts">
    import { toClipboard } from '@components/editor/util/Clipboard';
    import Button from '@components/widgets/Button.svelte';
    import Project from '@db/projects/Project';
    import Example from '@nodes/Example';
    import Source from '@nodes/Source';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import type Spaces from '@parser/Spaces';
    import { COPY_SYMBOL } from '@parser/Symbols';
    import Evaluator from '@runtime/Evaluator';
    import { onMount } from 'svelte';
    import { DB, locales } from '../../db/Database';
    import Stage, { NameGenerator, toStage } from '../../output/Stage';
    import type Value from '../../values/Value';
    import OutputView from '../output/OutputView.svelte';
    import { getConceptIndex } from '../project/Contexts';
    import ValueView from '../values/ValueView.svelte';
    import CodeView from './CodeView.svelte';

    interface Props {
        example: Example;
        spaces: Spaces;
        /** True if this example should show it's value. */
        evaluated: boolean;
        inline: boolean;
    }

    let { example, spaces, evaluated, inline }: Props = $props();

    let value: Value | undefined = $state(undefined);
    let stage: Stage | undefined = $state(undefined);
    let evaluator: Evaluator | undefined = $state();
    let copied = $state(false);

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

    function reset(hard: boolean) {
        // Don't create a new evaluator if the project is the same.
        if (!hard && evaluator && evaluator.project === project) return;

        evaluator?.ignore(update);

        if (evaluated && project) {
            evaluator = new Evaluator(project, DB, $locales.getLocales());
            evaluator.observe(update);
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
        <div class="code" class:evaluated class:inline>
            <CodeView
                node={example.program}
                {inline}
                spaces={getPreferredSpaces(example.program)}
                outline={false}
                describe={false}
            />
        </div>
        {#if evaluated && value}
            <div class="value"
                >{#if stage && evaluator && project}
                    <div class="stage">
                        <OutputView
                            {project}
                            {evaluator}
                            {value}
                            grid
                            editable={false}
                        />
                    </div>
                {:else}<ValueView {value} inline={false} />{/if}</div
            >
        {/if}
    </div>
    <div class="tools">
        <Button
            tip={$locales.get((l) => l.ui.project.button.copy.tip)}
            action={() => {
                copied = true;
                toClipboard(
                    example.program.toWordplay(
                        getPreferredSpaces(example.program),
                    ),
                );
                // In case its already pressed, show it again.
                setTimeout(() => (copied = false), 1000);
            }}
            icon={COPY_SYMBOL}
        >
            {#if copied}✓{/if}</Button
        >

        <Button
            tip={$locales.get((l) => l.ui.timeline.button.reset)}
            icon="↻"
            action={() => reset(true)}
        ></Button>
    </div>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        max-width: 100%;
    }

    .value {
        text-align: right;
    }

    .example {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }

    .code.inline {
        display: inline;
    }

    .stage {
        display: flex;
        width: 100%;
        aspect-ratio: 4/3;
        border-radius: var(--wordplay-border-radius);
        border-top-right-radius: 0;
        border-top-left-radius: 0;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .code.evaluated {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-bottom: none;
        overflow-x: auto;
        white-space: nowrap;
    }

    .tools {
        justify-content: end;
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        margin-top: var(--wordplay-spacing);
    }
</style>

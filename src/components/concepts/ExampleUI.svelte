<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { getConceptIndex } from '../project/Contexts';
    import Project from '@models/Project';
    import type Example from '@nodes/Example';
    import Source from '@nodes/Source';
    import type Spaces from '@parser/Spaces';
    import ValueView from '../values/ValueView.svelte';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '../../values/Value';
    import CodeView from './CodeView.svelte';
    import { DB, locales } from '../../db/Database';
    import Stage, { NameGenerator, toStage } from '../../output/Stage';
    import OutputView from '../output/OutputView.svelte';
    import Button from '@components/widgets/Button.svelte';

    export let example: Example;
    export let spaces: Spaces;
    /** True if this example should show it's value. */
    export let evaluated: boolean;
    export let inline: boolean;

    $: project = Project.make(
        null,
        'example',
        new Source('example', [example.program, spaces]),
        [],
        $locales.getLocales(),
    );
    let value: Value | undefined = undefined;
    let stage: Stage | undefined = undefined;
    let evaluator: Evaluator | undefined;
    $: {
        if (evaluator) evaluator.ignore(update);

        if (evaluated) {
            evaluator = new Evaluator(project, DB, $locales);
            evaluator.observe(update);
            evaluator.start();
        } else {
            evaluator = undefined;
        }
    }

    function update() {
        if (evaluator) {
            value = evaluator.getLatestSourceValue(project.getMain());
            stage = value
                ? toStage(evaluator, value, new NameGenerator())
                : undefined;
        }
    }

    onMount(() => {
        return () => {
            if (evaluator) {
                evaluator.stop();
                evaluator.ignore(update);
            }
        };
    });

    let index = getConceptIndex();

    // Keep track of the last example so we can remove it when the example changes.
    let lastExample = example;
    $: {
        if ($index) {
            if (lastExample) {
                $index.removeExample(lastExample.program.expression);
            }
            lastExample = example;
            $index.addExample(example.program.expression);
        }
    }

    // Remove the example from the index.
    onDestroy(() => {
        $index?.removeExample(example.program.expression);
    });
</script>

<div class="container">
    <div class="example">
        <div class="code" class:evaluated class:inline
            ><CodeView
                node={example.program}
                {inline}
                {spaces}
                outline={false}
                describe={false}
            /></div
        >{#if evaluated && value}
            <div class="value"
                >{#if stage && evaluator}
                    <div class="stage">
                        <OutputView
                            {project}
                            {evaluator}
                            {value}
                            editable={false}
                        />
                    </div>
                {:else}<ValueView {value} inline={false} />{/if}</div
            >
        {/if}
    </div>
    <Button
        tip={$locales.get((l) => l.ui.timeline.button.reset)}
        action={() => {
            project = project;
        }}>↻</Button
    >
</div>

<style>
    .container {
        display: flex;
        flex-direction: row;
        align-items: end;
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
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .code.evaluated {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        overflow-x: auto;
        white-space: nowrap;
    }
</style>

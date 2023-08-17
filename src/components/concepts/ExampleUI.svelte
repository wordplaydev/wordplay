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
    import { database, locales } from '../../db/Database';
    import Stage, { toStage } from '../../output/Stage';
    import OutputView from '../output/OutputView.svelte';

    export let example: Example;
    export let spaces: Spaces;
    /** True if this example should show it's value. */
    export let evaluated: boolean;
    export let inline: boolean;

    $: project = new Project(
        null,
        'example',
        new Source('example', [example.program, spaces]),
        [],
        $locales
    );
    let value: Value | undefined = undefined;
    let stage: Stage | undefined = undefined;
    let evaluator: Evaluator | undefined;
    $: {
        if (evaluator) evaluator.ignore(update);

        if (evaluated) {
            evaluator = new Evaluator(project, database);
            evaluator.observe(update);
            evaluator.start();
        } else {
            evaluator = undefined;
        }
    }

    function update() {
        if (evaluator) {
            value = evaluator.getLatestSourceValue(project.main);
            stage = value ? toStage(project, value) : undefined;
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

<div class="example" class:evaluated class:inline
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
                    fullscreen={false}
                    mini
                />
            </div>
        {:else}<ValueView {value} inline={false} />{/if}</div
    >
{/if}

<style>
    .value {
        margin: var(--wordplay-spacing);
        text-align: right;
    }

    .example.inline {
        display: inline;
    }

    .stage {
        width: 100%;
        aspect-ratio: 4/3;
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .example.evaluated {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        overflow-x: scroll;
        white-space: nowrap;
    }
</style>

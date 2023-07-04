<script lang="ts">
    import { onDestroy } from 'svelte';
    import RootView from '../project/RootView.svelte';
    import { getConceptIndex } from '../project/Contexts';
    import Project from '@models/Project';
    import type Example from '@nodes/Example';
    import Source from '@nodes/Source';
    import type Spaces from '@parser/Spaces';
    import ValueView from '../values/ValueView.svelte';
    import Evaluator from '@runtime/Evaluator';

    export let example: Example;
    export let spaces: Spaces;
    /** True if this example should show it's value. */
    export let evaluated: boolean;

    /** The code is inline if it has any line breaks. */
    $: inline = !spaces.hasLineBreaks(example);

    $: project = new Project(
        null,
        'example',
        new Source('example', [example.program, spaces]),
        []
    );
    $: value = evaluated ? new Evaluator(project).getInitialValue() : undefined;

    let index = getConceptIndex();

    if ($index) {
        $index.addExample(example.program.expression);

        onDestroy(() => {
            $index?.removeExample(example.program.expression);
        });
    }
</script>

{#if evaluated}
    <RootView node={example.program} />
    {#if value}
        <div class="value"><ValueView {value} /></div>
    {/if}
{:else}
    <RootView node={example.program} {inline} />
{/if}

<style>
    .value {
        margin: var(--wordplay-spacing);
    }
</style>

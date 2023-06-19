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

    /** The code is inline if it has any line breaks. */
    $: inline = !spaces.hasLineBreaks(example);

    $: project = new Project(
        null,
        'example',
        new Source('example', [example.program, spaces]),
        []
    );
    $: value = new Evaluator(project).getInitialValue();

    let index = getConceptIndex();

    if ($index) {
        $index.addExample(example.program.expression);

        onDestroy(() => {
            $index?.removeExample(example.program.expression);
        });
    }

    let see = false;

    function toggle() {
        see = !see;
    }
</script>

<span
    tabIndex="0"
    on:pointerdown={toggle}
    on:keydown={(event) =>
        event.key === ' ' || event.key === 'Enter' ? toggle() : undefined}
>
    <RootView node={example.program} {inline} />
    {#if see && value}
        &nbsp;…&nbsp;<ValueView {value} />
    {/if}
</span>

<style>
    span {
        cursor: pointer;
        user-select: none;
    }
</style>

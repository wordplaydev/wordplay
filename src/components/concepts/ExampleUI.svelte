<script lang="ts">
    import { onDestroy } from 'svelte';
    import RootView from '../project/RootView.svelte';
    import { getPaletteIndex } from '../project/Contexts';
    import Project from '../../models/Project';
    import type Example from '@nodes/Example';
    import Source from '@nodes/Source';
    import type Spaces from '../../parser/Spaces';
    import ValueView from '../values/ValueView.svelte';

    export let example: Example;
    export let spaces: Spaces;

    $: project = new Project(
        'example',
        new Source('example', [example.program, spaces]),
        []
    );
    $: project.evaluate();
    $: value = project.evaluator.getLatestSourceValue(project.main);

    let index = getPaletteIndex();

    $index.addExample(example.program.expression);

    onDestroy(() => {
        $index.removeExample(example.program.expression);
    });

    let see = false;

    function toggle() {
        see = !see;
    }
</script>

<span
    tabIndex="0"
    on:click={toggle}
    on:keydown={(event) =>
        event.key === ' ' || event.key === 'Enter' ? toggle() : undefined}
>
    <RootView node={example.program} />
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

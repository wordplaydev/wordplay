<svelte:options immutable={true} />

<script lang="ts">
    import type Value from '@values/Value';
    import valueToView from './valueToView';
    import { setContext } from 'svelte';
    import type Node from '../../nodes/Node';

    export let value: Value;
    export let node: Node | undefined = undefined;
    export let interactive = true;
    export let inline = true;

    if (interactive) setContext('interactive', true);
</script>

<span class="value" data-id={value.id} data-node-id={node?.id ?? null}
    ><svelte:component
        this={valueToView(value.constructor)}
        {value}
        {inline}
    /></span
>

<style>
    .value {
        color: var(--wordplay-evaluation-color);
        max-width: 100%;

        word-break: break-all;
    }
</style>

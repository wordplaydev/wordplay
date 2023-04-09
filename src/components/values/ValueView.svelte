<svelte:options immutable={true} />

<script lang="ts">
    import type Value from '@runtime/Value';
    import renderValue from './valueToView';
    import { setContext } from 'svelte';
    import type Node from '../../nodes/Node';

    export let value: Value;
    export let node: Node | undefined = undefined;
    export let interactive: boolean = true;

    if (interactive) setContext('interactive', true);
</script>

<span class="value" data-id={value.id} data-node-id={node?.id ?? null}
    ><svelte:component this={renderValue(value.constructor)} {value} /></span
>

<style>
    span {
        color: var(--wordplay-evaluation-color);
    }
</style>

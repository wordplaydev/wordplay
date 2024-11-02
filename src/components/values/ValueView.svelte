<script lang="ts">
    import type Value from '@values/Value';
    import valueToView from './valueToView';
    import { setContext } from 'svelte';
    import type Node from '../../nodes/Node';

    interface Props {
        value: Value;
        node?: Node | undefined;
        interactive?: boolean;
        inline?: boolean;
    }

    let {
        value,
        node = undefined,
        interactive = true,
        inline = true,
    }: Props = $props();

    if (interactive) setContext('interactive', true);

    const SvelteComponent = $derived(valueToView(value.constructor));
</script>

<span class="value" data-id={value.id} data-node-id={node?.id ?? null}
    ><SvelteComponent {value} {inline} /></span
>

<style>
    .value {
        color: var(--wordplay-evaluation-color);
        max-width: 100%;

        word-break: break-all;
    }

    :global(.value.evaluating) {
        color: var(--wordplay-background);
    }
</style>

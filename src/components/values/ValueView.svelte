<script lang="ts">
    import type Value from '@values/Value';
    import valueToView from './valueToView';
    import type Node from '../../nodes/Node';
    import { setInteractive } from '@components/project/Contexts';

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

    let isInteractive = $state({ interactive });
    // Keep the interactive state up to date.
    $effect(() => {
        isInteractive.interactive = interactive;
    });
    setInteractive(isInteractive);

    const SvelteComponent = $derived(valueToView(value.constructor));
</script>

<div class="value" data-id={value.id} data-node-id={node?.id ?? null}
    ><SvelteComponent {value} {inline} /></div
>

<style>
    .value {
        display: inline;
        color: var(--wordplay-evaluation-color);
        max-width: 100%;

        word-break: break-all;
    }

    :global(.value.evaluating) {
        color: var(--wordplay-background);
    }
</style>

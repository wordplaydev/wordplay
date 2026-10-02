<script lang="ts">
    import { setInteractive } from '#components/project/Contexts.ts';
    import type Value from '#values/Value.ts';
    import type Node from '#nodes/Node.ts';
    import valueToView from '#components/values/valueToView.ts';

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

    // svelte-ignore state_referenced_locally
    let isInteractive = $state({ interactive });
    // Keep the interactive state up to date.
    $effect(() => {
        isInteractive.interactive = interactive;
    });
    setInteractive(isInteractive);

    const SvelteComponent = $derived(valueToView(value.constructor));
</script>

<div
    class="value"
    id="value-{value.id}"
    data-id={value.id}
    data-node-id={node?.id ?? null}><SvelteComponent {value} {inline} /></div
>

<style>
    .value {
        display: inline;
        /* Output is worth copying. Scoped here on purpose: four other
           components render a `value` class, the editor's included. */
        user-select: text;
        -webkit-user-select: text;
        color: var(--wordplay-evaluation-color);
        max-width: 100%;

        word-break: break-all;
    }

    :global(.value.evaluating) {
        color: var(--wordplay-background);
    }
</style>

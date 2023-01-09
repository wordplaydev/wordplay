<script lang="ts">
    import type Concept from '../concepts/Concept';
    import RootView from '../editor/RootView.svelte';
    import { getPalettePath } from '../editor/util/Contexts';
    import { preferredTranslations } from '../translations/translations';
    import type Node from '../nodes/Node';
    import Note from './Note.svelte';

    export let node: Node;
    export let concept: Concept;
    export let describe: boolean = true;
    export let border: boolean = true;
    export let selectable: boolean = false;

    $: draggable = concept.getNodes().has(node);

    function select(event: MouseEvent | KeyboardEvent) {
        if (selectable && selection) {
            // If the concept is already in the selection, pop back to it.
            if ($selection.includes(concept)) {
                while ($selection.at(-1) !== concept) $selection.pop();
                selection.set([...$selection]);
            } else {
                selection.set([...$selection, concept]);
            }
            // Don't let the palette handle it.
            event.stopPropagation();
        }
    }

    $: selection = getPalettePath();
</script>

<div class="code" class:draggable>
    <div class="root" class:border>
        <RootView {node} />
    </div>
    {#if describe}
        <p
            class="description"
            class:selectable
            tabIndex={selectable ? 0 : null}
            on:mousedown={select}
            on:keydown={(event) =>
                event.key === 'Enter' || event.key === ' '
                    ? select(event)
                    : undefined}
        >
            <Note>{concept.getDescription($preferredTranslations[0])}</Note>
        </p>
    {/if}
</div>

<style>
    .code {
        display: inline-block;
        vertical-align: middle;
    }

    .root.border {
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius)
            calc(3 * var(--wordplay-border-radius))
            calc(3 * var(--wordplay-border-radius))
            var(--wordplay-border-radius);
    }

    .root {
        display: inline-block;
        cursor: pointer;
        user-select: none;
    }

    .draggable .root:hover {
        animation: wobble 0.25s ease-out infinite;
    }

    .description {
        margin: var(--wordplay-spacing);
    }

    .description:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
    }

    .description.selectable {
        cursor: pointer;
    }

    .description.selectable {
        color: var(--wordplay-highlight);
    }

    .description.selectable:hover {
        text-decoration: underline;
    }

    @keyframes wobble {
        0% {
            transform: rotate(5deg);
        }
        50% {
            transform: rotate(-5deg);
        }
        100% {
            transform: rotate(5deg);
        }
    }
</style>

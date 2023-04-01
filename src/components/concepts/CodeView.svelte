<script lang="ts">
    import type Concept from '@concepts/Concept';
    import RootView from '../project/RootView.svelte';
    import { getConceptPath } from '../project/Contexts';
    import { preferredTranslations } from '@translation/translations';
    import type Node from '@nodes/Node';
    import Note from '../widgets/Note.svelte';
    import type StructureConcept from '@concepts/StructureConcept';
    import TypeView from './TypeView.svelte';
    import DescriptionView from './DescriptionView.svelte';
    import { toClipboard } from '../editor/util/Clipboard';

    export let node: Node;
    export let concept: Concept;
    export let types: StructureConcept[] | undefined = undefined;
    export let describe: boolean = true;
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

    function copy() {
        toClipboard(node);
    }

    $: selection = getConceptPath();
    $: description = node.getLabel($preferredTranslations[0]);
</script>

<div class="view" class:draggable>
    <div class="code">
        <div
            class="node"
            tabIndex="0"
            on:keydown={(event) =>
                event.key === 'c' && (event.ctrlKey || event.metaKey)
                    ? copy()
                    : undefined}><RootView {node} /></div
        >{#if types}&nbsp;<TypeView {types} />
        {/if}
    </div>
    {#if describe}
        <div
            class="description"
            class:selectable
            tabIndex={selectable ? 0 : null}
            on:mousedown={select}
            on:keydown={(event) =>
                event.key === 'Enter' || event.key === ' '
                    ? select(event)
                    : undefined}
        >
            <Note>
                {#if description}
                    <DescriptionView {description} />
                {/if}</Note
            >
        </div>
    {/if}
</div>

<style>
    .view {
        display: inline-block;
        vertical-align: middle;
        margin-right: var(--wordplay-spacing);
    }

    .node {
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius)
            calc(3 * var(--wordplay-border-radius))
            calc(3 * var(--wordplay-border-radius))
            var(--wordplay-border-radius);
        display: inline-block;
        cursor: pointer;
        user-select: none;
        display: inline-block;
        vertical-align: middle;
    }

    .code {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: baseline;
    }

    :global(.animated) .node:focus,
    :global(.animated) .node:hover {
        animation: wobble ease-out infinite;
        animation-duration: 200ms;
    }

    .description {
        margin-left: var(--wordplay-spacing);
        margin-top: var(--wordplay-spacing);
    }

    .description:focus {
        outline: none;
        border-bottom: var(--wordplay-highlight) solid
            var(--wordplay-focus-width);
    }

    .description.selectable {
        cursor: pointer;
    }

    .description.selectable {
        color: var(--wordplay-highlight);
    }

    .description.selectable:hover {
        text-decoration: underline;
        text-decoration-thickness: var(--wordplay-focus-width);
    }

    @keyframes wobble {
        0% {
            transform: rotate(1deg);
        }
        50% {
            transform: rotate(-1deg);
        }
        100% {
            transform: rotate(1deg);
        }
    }
</style>

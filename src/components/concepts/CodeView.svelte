<script lang="ts">
    import type Concept from '@concepts/Concept';
    import RootView from '../project/RootView.svelte';
    import {
        getConceptIndex,
        getConceptPath,
        getDragged,
    } from '../project/Contexts';
    import type Node from '@nodes/Node';
    import TypeView from './TypeView.svelte';
    import { toClipboard } from '../editor/util/Clipboard';
    import { creator } from '../../db/Creator';
    import type Type from '../../nodes/Type';
    import type Spaces from '../../parser/Spaces';

    export let node: Node;
    export let concept: Concept | undefined = undefined;
    export let spaces: Spaces | undefined = undefined;
    export let type: Type | undefined = undefined;
    export let describe: boolean = true;
    export let selectable: boolean = false;
    export let inline: boolean = false;
    export let outline: boolean = true;
    /** If true, shows the owner of the concept. */
    export let showOwner: boolean = false;

    let index = getConceptIndex();
    let dragged = getDragged();

    function select(event: MouseEvent | KeyboardEvent) {
        if (concept && selectable && selection) {
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

    function handlePointerDown() {
        // Set the dragged node to a deep clone of the (it may contain nodes from declarations that we don't want leaking into the program);
        dragged.set(node.clone());
    }

    function copy() {
        toClipboard(node);
    }

    $: selection = getConceptPath();
    $: owner = concept ? $index?.getConceptOwner(concept) : undefined;
    $: description = concept
        ? (owner && showOwner
              ? owner.getName($creator.getLocale(), false) + '.'
              : '') + concept.getName($creator.getLocale(), false)
        : undefined;
</script>

<div class="view">
    <div class="code">
        <div
            role="textbox"
            class="draggable node"
            class:outline
            tabindex="0"
            on:pointerdown|stopPropagation={handlePointerDown}
            on:keydown={(event) =>
                event.key === 'c' && (event.ctrlKey || event.metaKey)
                    ? copy()
                    : undefined}><RootView {node} {inline} {spaces} /></div
        >{#if type && concept}&nbsp;<TypeView
                {type}
                context={concept.context}
            />
        {/if}
    </div>
    {#if describe}
        <div
            role="textbox"
            class="description"
            class:selectable
            tabindex={selectable ? 0 : null}
            on:pointerdown={select}
            on:keydown={(event) =>
                event.key === 'Enter' || event.key === ' '
                    ? select(event)
                    : undefined}
        >
            {#if description}
                {description}
            {/if}
        </div>
    {/if}
</div>

<style>
    .view {
        display: inline-block;
        touch-action: none;
    }

    .node {
        display: inline-block;
        cursor: pointer;
        user-select: none;
        display: inline-block;
        vertical-align: middle;
    }

    .node.outline {
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius)
            calc(3 * var(--wordplay-border-radius))
            calc(3 * var(--wordplay-border-radius))
            var(--wordplay-border-radius);
    }

    .code {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: baseline;
    }

    .node:focus,
    .node:hover {
        animation: wobble ease-out infinite;
        animation-duration: calc(var(--animation-factor) * 200ms);
    }

    .description {
        margin-left: var(--wordplay-spacing);
        margin-top: calc(var(--wordplay-spacing) / 2);
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
        text-decoration: underline;
        text-decoration-color: var(--wordplay-highlight);
    }

    .description.selectable:hover {
        text-decoration: underline;
        text-decoration-color: var(--wordplay-highlight);
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

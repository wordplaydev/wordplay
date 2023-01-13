<script lang="ts">
    import type Concept from '../concepts/Concept';
    import RootView from '../editor/RootView.svelte';
    import { getPalettePath } from '../editor/util/Contexts';
    import { preferredTranslations } from '../translation/translations';
    import type Node from '../nodes/Node';
    import Note from './Note.svelte';
    import type StructureConcept from '../concepts/StructureConcept';
    import TypeView from './TypeView.svelte';
    import DescriptionView from './DescriptionView.svelte';

    export let node: Node;
    export let concept: Concept;
    export let types: StructureConcept[] | undefined = undefined;
    export let describe: boolean = true;
    export let border: boolean = true;
    export let selectable: boolean = false;
    export let docs: boolean = true;

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
    $: doc = docs
        ? concept.getDocs($preferredTranslations[0])?.getFirstParagraph()
        : undefined;
    $: description = docs
        ? undefined
        : node.getDescription($preferredTranslations[0], concept.context);
</script>

<div class="code" class:draggable>
    <div class="codeandtype">
        <div class="root" class:border><RootView {node} /></div
        >{#if types}&nbsp;<TypeView {types} />
        {/if}
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
            <Note>
                {#if docs}
                    {#if doc}
                        {doc
                            .toLocaleLowerCase(
                                $preferredTranslations[0].language
                            )
                            .substring(
                                0,
                                doc.endsWith('.') ? doc.length - 1 : doc.length
                            )}
                    {:else}
                        learn more…
                    {/if}
                {:else if description}
                    <DescriptionView {description} />
                {/if}</Note
            >
        </p>
    {/if}
</div>

<style>
    .code {
        display: inline-block;
        vertical-align: middle;
        margin-right: var(--wordplay-spacing);
    }

    .root.border {
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius)
            calc(3 * var(--wordplay-border-radius))
            calc(3 * var(--wordplay-border-radius))
            var(--wordplay-border-radius);
    }

    .codeandtype {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: baseline;
    }

    .root {
        display: inline-block;
        cursor: pointer;
        user-select: none;
        display: inline-block;
        vertical-align: middle;
    }

    .border.root:hover {
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
        text-decoration-thickness: var(--wordplay-focus-width);
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

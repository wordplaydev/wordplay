<script lang="ts">
    import type Evaluate from '../nodes/Evaluate';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '../translation/translations';
    import { PhraseType } from '../output/Phrase';
    import Literal from '../nodes/Literal';
    import Measurement from '../runtime/Measurement';
    import type Value from '../runtime/Value';
    import Expression from '../nodes/Expression';
    import BindSlider from './BindSlider.svelte';
    import Bind from '../nodes/Bind';
    import { project, updateProject } from '../models/stores';
    import Button from './Button.svelte';
    import { getSelectedOutput } from '../editor/util/Contexts';
    import Note from './Note.svelte';
    import { fade } from 'svelte/transition';

    export let nodes: Evaluate[];
    export let position: { x: number; y: number };

    type Control = {
        type: 'slider';
        min: number;
        max: number;
        step: number;
        unit: string;
    };
    type PhraseProperty = {
        name: string;
        editable: boolean | ((phrase: Evaluate) => boolean);
        type: Control;
    };

    type PropertyValues = (
        | {
              given: boolean;
              value: Value | Expression | Expression[] | undefined;
          }
        | undefined
    )[];

    const properties: PhraseProperty[] = [
        {
            name: 'size',
            type: { type: 'slider', min: 1, max: 64, step: 1, unit: 'm' },
            editable: true,
        },
        {
            name: 'opacity',
            type: { type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
            editable: true,
        },
        {
            name: 'rotation',
            type: { type: 'slider', min: 0, max: 360, step: 1, unit: '°' },
            editable: true,
        },
    ];

    let valuesByProperty: Record<string, PropertyValues> = {};
    $: {
        valuesByProperty = {};
        for (const property of properties)
            valuesByProperty[property.name] = nodes.map((evaluate) =>
                getPropertyValue(evaluate, property.name)
            );
    }

    let selectedOutput = getSelectedOutput();

    function getPropertyValue(evaluate: Evaluate, name: string) {
        // First, find the expressino the binding is mapped to, if any.
        const binding = evaluate
            .getInputMapping(PhraseType)
            .inputs.find((mapping) => mapping.expected.names.hasName(name));

        // Didn't find the binding? Undefined.
        if (binding === undefined) return undefined;

        // If the binding is mapped to a default value, get its value if a literal or its expression if not
        const expression =
            binding.given === undefined
                ? binding.expected.value
                : binding.given instanceof Bind
                ? binding.given.value
                : binding.given;
        return {
            given: binding.given !== undefined,
            value:
                expression instanceof Literal
                    ? expression.getValue()
                    : expression,
        };
    }

    function getNumberProperty(
        values: PropertyValues,
        unit: string
    ): number | undefined {
        // If they're all equal number values, return the value.
        let number: number | undefined = undefined;
        for (const value of values) {
            if (value?.value instanceof Measurement) {
                const num = value.value.toNumber();
                if (number === undefined) number = num;
                else if (number !== num) return undefined;
            } else return undefined;
        }
        return unit === '%' && number !== undefined ? number * 100 : number;
    }

    function unsetProperty(name: string) {
        if ($project) {
            const replacements: [Evaluate, Evaluate | undefined][] = nodes.map(
                (evaluate) => [
                    evaluate,
                    $project
                        ? evaluate.withBindAs(
                              name,
                              undefined,
                              $project.getNodeContext(evaluate)
                          )
                        : undefined,
                ]
            );
            // Replace the old selected output with the new one
            selectedOutput.set(
                $selectedOutput.map((n) => {
                    const rep = replacements.find((rep) => rep[0] === n);
                    return rep === undefined || rep[1] === undefined
                        ? n
                        : rep[1];
                })
            );
            // Update the project with the new sources.
            updateProject($project.wWithRevisedNodes(replacements));
        }
    }

    let view: HTMLElement;

    export let dragging: boolean = false;
    let startPosition: { x: number; y: number } = { x: 0, y: 0 };
    function startDrag(event: MouseEvent) {
        if (
            !(event.target instanceof HTMLInputElement) &&
            event.currentTarget instanceof HTMLElement
        ) {
            const outputRect = getOutputRect();
            if (outputRect === undefined) return;

            dragging = true;
            position = {
                x: event.clientX - outputRect.left,
                y: event.clientY - outputRect.top,
            };

            const rect = view.getBoundingClientRect();

            startPosition = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };
        }
    }

    function getOutputRect() {
        return view.closest('.output')?.getBoundingClientRect();
    }

    function handleKey(event: KeyboardEvent) {
        if (event.target !== view) return;

        startPosition = { x: 0, y: 0 };
        const outputRect = getOutputRect();
        const viewRect = view.getBoundingClientRect();
        if (outputRect === undefined) return;

        const rightEdge = outputRect.width - viewRect.width;
        const bottomEdge = outputRect.height - viewRect.height;

        const increment = 20;

        if (event.key === 'ArrowLeft')
            position = {
                x: Math.max(0, position.x - increment),
                y: position.y,
            };
        else if (event.key === 'ArrowUp')
            position = {
                x: position.x,
                y: Math.max(0, position.y - increment),
            };
        else if (event.key === 'ArrowRight')
            position = {
                x: Math.min(rightEdge, position.x + increment),
                y: position.y,
            };
        else if (event.key === 'ArrowDown')
            position = {
                x: position.x,
                y: Math.min(bottomEdge, position.y + increment),
            };
    }
</script>

<section
    class="editor"
    tabIndex="0"
    transition:fade={{ duration: 200 }}
    style={`left: ${position.x - startPosition.x}px; top: ${
        position.y - startPosition.y
    }px;`}
    on:keydown={handleKey}
    on:mousedown={startDrag}
    bind:this={view}
>
    <!-- {#if $project}
        {#each nodes as node}
            {@const text = node.getExpressionFor(
                'text',
                $project.getNodeContext(node)
            )}
            {#if text instanceof Node}
                <RootView node={text} />
            {/if}
        {/each}
    {/if} -->

    <table>
        {#each properties as property}
            <tr class="property">
                <td class="name"
                    ><Note
                        >{PhraseType.inputs
                            .find((input) => input.names.hasName(property.name))
                            ?.names?.getTranslation($preferredLanguages)}</Note
                    ></td
                >
                <td class="control">
                    {#if valuesByProperty[property.name].some((val) => val?.value instanceof Expression)}
                        computed
                    {:else if property.type.type === 'slider'}
                        <BindSlider
                            evaluates={nodes}
                            name={property.name}
                            value={getNumberProperty(
                                valuesByProperty[property.name],
                                property.type.unit
                            )}
                            min={property.type.min}
                            max={property.type.max}
                            unit={property.type.unit}
                            increment={property.type.step}
                            set={valuesByProperty[property.name].every(
                                (val) => val?.given
                            )}
                        />{/if}
                </td>
                <td class="revert">
                    {#if valuesByProperty[property.name].every((val) => val?.given)}
                        <Button
                            label="x"
                            tip={$preferredTranslations[0].ui.tooltip.revert}
                            action={() => unsetProperty(property.name)}
                        />
                    {/if}
                </td>
            </tr>
        {/each}
    </table>
</section>

<style>
    .editor {
        position: absolute;
        z-index: var(--wordplay-layer-controls);
        background-color: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        cursor: move;
        user-select: none;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    td:first-child {
        text-align: right;
    }

    td:not(:first-child) {
        padding-left: var(--wordplay-spacing);
    }

    .name {
        font-family: var(--wordplay-code-font);
    }
</style>

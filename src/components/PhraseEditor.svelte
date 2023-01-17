<script lang="ts">
    import type Evaluate from '../nodes/Evaluate';
    import { preferredLanguages } from '../translation/translations';
    import RootView from '../editor/RootView.svelte';
    import { PhraseType } from '../output/Phrase';
    import Literal from '../nodes/Literal';
    import Measurement from '../runtime/Measurement';
    import type Value from '../runtime/Value';
    import Expression from '../nodes/Expression';
    import BindSlider from './BindSlider.svelte';
    import Bind from '../nodes/Bind';
    import { project, updateProject } from '../models/stores';
    import Node from '../nodes/Node';
    import Button from './Button.svelte';
    import { getSelectedOutput } from '../editor/util/Contexts';

    export let nodes: Evaluate[];

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
</script>

<section>
    {#if $project}
        {#each nodes as node}
            {@const text = node.getExpressionFor(
                'text',
                $project.getNodeContext(node)
            )}
            {#if text instanceof Node}
                <RootView node={text} />
            {/if}
        {/each}
    {/if}

    <table class="properties">
        {#each properties as property}
            <tr class="property">
                <td class="name"
                    >{PhraseType.inputs
                        .find((input) => input.names.hasName(property.name))
                        ?.names?.getTranslation($preferredLanguages)}</td
                >
                <td>
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
                <td>
                    {#if valuesByProperty[property.name].every((val) => val?.given)}
                        <Button
                            label="x"
                            tip="revert to default"
                            action={() => unsetProperty(property.name)}
                        />
                    {/if}
                </td>
            </tr>
        {/each}
    </table>
</section>

<style>
    table {
        border-collapse: collapse;
        width: 100%;
    }

    td {
        padding: var(--wordplay-spacing);
    }

    td:first-child {
        text-align: right;
    }

    .name {
        font-family: var(--wordplay-code-font);
    }
</style>

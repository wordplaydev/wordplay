<script lang="ts">
    import Evaluate from '@nodes/Evaluate';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '@translation/translations';
    import { PhraseType } from '@output/Phrase';
    import Literal from '@nodes/Literal';
    import Measurement from '@runtime/Measurement';
    import type Value from '@runtime/Value';
    import type Expression from '@nodes/Expression';
    import BindSlider from './BindSlider.svelte';
    import Bind from '@nodes/Bind';
    import {
        reviseProject,
        selectedOutput,
        updateProject,
    } from '../../models/stores';
    import Button from '../widgets/Button.svelte';
    import Note from '../widgets/Note.svelte';
    import { SupportedFonts } from '@native/Fonts';
    import BindOptions from './BindOptions.svelte';
    import Text from '@runtime/Text';
    import { VerseType } from '@output/Verse';
    import type Project from '../../models/Project';
    import BindColor from './BindColor.svelte';
    import { ColorType } from '@output/Color';
    import type Node from '@nodes/Node';
    import StructureDefinition from '@nodes/StructureDefinition';
    import { GroupType } from '@output/Group';
    import Reference from '@nodes/Reference';
    import { StackType } from '@output/Stack';
    import TextLiteral from '@nodes/TextLiteral';

    export let project: Project;

    $: nodes =
        $selectedOutput.filter(
            (node): node is Evaluate =>
                node instanceof Evaluate &&
                (node.is(PhraseType, project.getNodeContext(node)) ||
                    node.is(VerseType, project.getNodeContext(node)))
        ) ?? [];

    type Slider = {
        type: 'slider';
        min: number;
        max: number;
        step: number;
        unit: string;
    };

    type Options = {
        type: 'options';
        options: (string | undefined)[];
    };

    type Color = {
        type: 'color';
    };

    type OutputProperty = {
        name: string;
        editable: boolean | ((phrase: Evaluate) => boolean);
        type: Slider | Options | Color;
    };

    type PropertyValues = (
        | {
              given: boolean;
              value: Value | Expression | Expression[] | undefined;
          }
        | undefined
    )[];

    const fontProperty: OutputProperty = {
        name: 'font',
        type: {
            type: 'options',
            options: [undefined, ...SupportedFonts.map((font) => font.name)],
        },
        editable: true,
    };

    const phraseProperties: OutputProperty[] = [
        fontProperty,
        { name: 'color', type: { type: 'color' }, editable: true },
        {
            name: 'size',
            type: { type: 'slider', min: 0.25, max: 32, step: 0.25, unit: 'm' },
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

    const verseProperties: OutputProperty[] = [
        fontProperty,
        { name: 'foreground', type: { type: 'color' }, editable: true },
        { name: 'background', type: { type: 'color' }, editable: true },
    ];

    $: isVerse = nodes.some((node) =>
        node.is(VerseType, project.getNodeContext(node))
    );

    $: currentType = isVerse ? VerseType : PhraseType;
    $: currentProperties = isVerse ? verseProperties : phraseProperties;

    let valuesByProperty: Record<string, PropertyValues> = {};
    $: {
        valuesByProperty = {};
        if (project) {
            for (const property of currentProperties)
                valuesByProperty[property.name] = nodes.map((evaluate) =>
                    getPropertyValue(evaluate, property.name)
                );
        }
    }

    function getPropertyValue(evaluate: Evaluate, name: string) {
        // First, find the expressino the binding is mapped to, if any.
        const binding = evaluate
            .getInputMapping(currentType)
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

    function getTextProperty(values: PropertyValues): string | undefined {
        // If they're all equal text values, return the value.
        let text: string | undefined = undefined;
        for (const value of values) {
            if (value?.value instanceof Text) {
                const thisText = value.value.text;
                if (text === undefined) text = thisText;
                else if (thisText !== text) return undefined;
            } else return undefined;
        }
        return text;
    }

    function getColorProperty(values: PropertyValues): Evaluate | undefined {
        // If they're all equal color values, return the value.
        let color: Evaluate | undefined = undefined;
        for (const value of values) {
            if (
                value &&
                value.value instanceof Evaluate &&
                value.value.getFunction(project.getNodeContext(value.value)) ===
                    ColorType
            ) {
                if (color === undefined) color = value.value;
                else if (!color.equals(value.value)) return undefined;
            } else return undefined;
        }
        return color;
    }

    function unsetProperty(name: string) {
        const replacements: [Evaluate, Evaluate | undefined][] = nodes.map(
            (evaluate) => [
                evaluate,
                project
                    ? evaluate.withBindAs(
                          name,
                          undefined,
                          project.getNodeContext(evaluate)
                      )
                    : undefined,
            ]
        );
        // Replace the old selected output with the new one
        selectedOutput.set(
            $selectedOutput.map((n) => {
                const rep = replacements.find((rep) => rep[0] === n);
                return rep === undefined || rep[1] === undefined ? n : rep[1];
            })
        );
        // Update the project with the new sources.
        updateProject(project.withRevisedNodes(replacements));
    }

    function addOutput() {
        const source = project.main;

        // Make an empty phrase.
        const newPhrase = Evaluate.make(
            Reference.make(
                PhraseType.names.getTranslation($preferredLanguages),
                PhraseType
            ),
            [TextLiteral.make($preferredTranslations[0].welcome)]
        );

        // Get the output of the source's program block.
        const lastExpression = source.expression.expression.statements.at(-1);

        let revision: [Node, Node] | undefined = undefined;

        // There's a last expression
        if (lastExpression) {
            const context = project.getNodeContext(lastExpression);
            const type =
                lastExpression instanceof Evaluate
                    ? lastExpression.getFunction(context)
                    : undefined;

            // If it's a verse, add the new phrase to the verse's group
            if (type === VerseType) {
                const firstVerseInput =
                    lastExpression instanceof Evaluate
                        ? lastExpression.inputs[0]
                        : undefined;
                const firstVerseEvaluate =
                    firstVerseInput instanceof Evaluate
                        ? firstVerseInput
                        : undefined;
                const firstVerseType =
                    firstVerseInput instanceof Evaluate
                        ? firstVerseInput.getFunction(context)
                        : undefined;
                // If the verse group input is a group, append the phrase to the group.
                if (
                    firstVerseEvaluate &&
                    firstVerseType instanceof StructureDefinition &&
                    type.implements(GroupType, context)
                ) {
                    revision = [
                        firstVerseEvaluate,
                        firstVerseEvaluate.withInputAppended(newPhrase),
                    ];
                }
            }
            // If it's a phrase, create a verse to hold the existing phrase and the new phrase
            else if (type === PhraseType) {
                revision = [
                    lastExpression,
                    Evaluate.make(
                        Reference.make(
                            VerseType.names.getTranslation($preferredLanguages),
                            VerseType
                        ),
                        [
                            Evaluate.make(
                                Reference.make(
                                    StackType.names.getTranslation(
                                        $preferredLanguages
                                    ),
                                    StackType
                                ),
                                [lastExpression, newPhrase]
                            ),
                        ]
                    ),
                ];
            }
            // If it's a group...
            else if (
                type instanceof StructureDefinition &&
                type.implements(GroupType, context)
            ) {
            }
            // Otherwise, append the phrase.
            else {
                revision = [
                    source.expression.expression,
                    source.expression.expression.withStatement(newPhrase),
                ];
            }
        }
        // Nothing yet, just add the phrase to the program.
        else {
            revision = [
                source.expression.expression,
                source.expression.expression.withStatement(newPhrase),
            ];
        }

        if (revision) {
            reviseProject([revision]);
            selectedOutput.set([newPhrase]);
        }
    }
</script>

<section class="palette" tabIndex="0">
    <div class="actions">
        <Button
            tip={$preferredTranslations[0].ui.tooltip.addPhrase}
            action={addOutput}>+</Button
        >
    </div>

    {#if nodes.length > 0}
        <table>
            {#each currentProperties as property}
                {@const allSet = valuesByProperty[property.name].every(
                    (val) => val?.given
                )}
                <tr class="property">
                    <td class="name"
                        ><Note
                            >{currentType.inputs
                                .find((input) =>
                                    input.names.hasName(property.name)
                                )
                                ?.names?.getTranslation(
                                    $preferredLanguages
                                )}</Note
                        ></td
                    >
                    <td class="control">
                        <!-- {#if valuesByProperty[property.name].some((val) => val?.value instanceof Expression)}
                            <RootView node={parseFunction(toTokens('ƒ()'))} /> -->
                        {#if property.type.type === 'slider'}
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
                                set={allSet}
                            />
                        {:else if property.type.type === 'options'}
                            <BindOptions
                                name={property.name}
                                evaluates={nodes}
                                value={getTextProperty(
                                    valuesByProperty[property.name]
                                )}
                                options={property.type.options}
                            />
                        {:else if property.type.type === 'color'}
                            <BindColor
                                evaluates={nodes}
                                name={property.name}
                                value={getColorProperty(
                                    valuesByProperty[property.name]
                                )}
                            />
                        {/if}
                    </td>
                    <td class="revert">
                        {#if allSet}
                            <Button
                                tip={$preferredTranslations[0].ui.tooltip
                                    .revert}
                                action={() => unsetProperty(property.name)}
                                >x</Button
                            >
                        {/if}
                    </td>
                </tr>
            {/each}
        </table>
    {:else}
        <table><tr><td>&mdash;</td></tr></table>
    {/if}
</section>

<style>
    .palette {
        background-color: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
        cursor: move;
        user-select: none;
        min-width: 100%;
        min-height: 100%;
    }

    .actions {
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .palette:focus {
        outline: none;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    td {
        padding-top: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
    }

    td:first-child {
        text-align: right;
    }

    tr:nth-child(odd) {
        background: var(--wordplay-chrome);
    }

    td:not(:first-child) {
        padding-left: var(--wordplay-spacing);
    }

    .name {
        font-family: var(--wordplay-code-font);
    }
</style>

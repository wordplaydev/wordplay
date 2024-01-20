<script context="module" lang="ts">
    export type AnnotationInfo = {
        node: Node;
        element: Element | null;
        messages: Markup[];
        kind: 'step' | 'primary' | 'secondary' | 'minor';
        context: Context;
        resolutions?: Resolution[];
    };
</script>

<script lang="ts">
    import type Conflict from '@conflicts/Conflict';
    import Expression from '@nodes/Expression';
    import Node from '@nodes/Node';
    import Annotation from './Annotation.svelte';
    import { tick } from 'svelte';
    import type Step from '@runtime/Step';
    import type Evaluator from '@runtime/Evaluator';
    import type Project from '../../models/Project';
    import { getConceptIndex, getEvaluation } from '../project/Contexts';
    import type Markup from '../../nodes/Markup';
    import concretize from '../../locale/concretize';
    import type Source from '../../nodes/Source';
    import { locales } from '../../db/Database';
    import Speech from '@components/lore/Speech.svelte';
    import Glyphs from '../../lore/Glyphs';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { docToMarkup } from '@locale/Locale';
    import {
        DecrementLiteral,
        IncrementLiteral,
        ShowMenu,
        toShortcut,
    } from '@components/editor/util/Commands';
    import type Caret from '@edit/Caret';
    import NodeRef from '@locale/NodeRef';
    import { DOCUMENTATION_SYMBOL } from '@parser/Symbols';
    import ConceptLinkUI from '@components/concepts/ConceptLinkUI.svelte';
    import type { Resolution } from '@conflicts/Conflict';
    import Context from '@nodes/Context';
    import CommandButton from '@components/widgets/CommandButton.svelte';
    import Expander from '@components/widgets/Expander.svelte';

    /** The project for which annotations should be shown */
    export let project: Project;
    /** The evaluator running the program */
    export let evaluator: Evaluator;
    /** The source who's annotations to show.*/
    export let source: Source;
    /** The source ID of the source */
    export let sourceID: string;
    /** Whether we're stepping */
    export let stepping: boolean;
    /** Conflicts to show */
    export let conflicts: Conflict[];
    /** The caret of the editor this is annotating */
    export let caret: Caret | undefined;

    /** Whether the annotations view is expanded */
    let expanded = true;

    let evaluation = getEvaluation();
    let concepts = getConceptIndex();
    let annotations: AnnotationInfo[] = [];
    let annotationsByNode: Map<Node, AnnotationInfo[]> = new Map();

    $: caretNode = caret
        ? caret.position instanceof Node
            ? caret.position
            : caret.tokenExcludingSpace
        : undefined;
    $: context = project.getContext(source);
    $: relevantConcept =
        $concepts && caret && caret.position instanceof Node
            ? $concepts?.getRelevantConcept(caret.position)
            : undefined;

    // See if the caret is adjustable.
    $: adjustable =
        caret && caretNode ? caret.getAdjustableLiteral() : undefined;

    // When any of these states change, update annotations.
    $: {
        stepping;
        conflicts;
        $evaluation;
        updateAnnotations();
    }

    async function updateAnnotations() {
        // Wait for DOM updates so that everything is in position before we layout annotations.
        await tick();

        annotations = [];
        if (stepping) {
            const [node, view] = getStepView();

            // Return a single annotation for the step.
            if (node && source.contains(node))
                annotations = [
                    {
                        node: node,
                        element: view,
                        messages: [
                            $evaluation?.step
                                ? ($evaluation?.step as Step).getExplanations(
                                      $locales,
                                      evaluator,
                                  )
                                : evaluator.steppedToNode() &&
                                    evaluator.isDone()
                                  ? concretize(
                                        $locales,
                                        $locales.get(
                                            (l) => l.node.Program.unevaluated,
                                        ),
                                    )
                                  : concretize(
                                        $locales,
                                        $locales.get(
                                            (l) => l.node.Program.done,
                                        ),
                                    ),
                        ],
                        kind: 'step',
                        context,
                    },
                ];
        } else {
            // Conflict all of the active conflicts to a list of annotations.
            annotations = conflicts
                .map((conflict: Conflict) => {
                    const nodes = conflict.getConflictingNodes();
                    const primary = nodes.primary;
                    const secondary = nodes.secondary;
                    // Based on the primary and secondary nodes given, decide what to show.
                    // We expect
                    // 1) a single primary node
                    // 2) zero or more secondary nodes
                    // From these, we generate one or two speech bubbles to illustrate the conflict.
                    return [
                        ...(source.contains(primary.node)
                            ? [
                                  {
                                      node: primary.node,
                                      element: getNodeView(primary.node),
                                      messages: [
                                          primary.explanation(
                                              $locales,
                                              project.getNodeContext(
                                                  primary.node,
                                              ) ??
                                                  project.getContext(
                                                      project.getMain(),
                                                  ),
                                          ),
                                      ],
                                      kind: conflict.isMinor()
                                          ? ('minor' as const)
                                          : ('primary' as const),
                                      context,
                                      // Place the resolutions in the primary node.
                                      resolutions: nodes.resolutions,
                                  },
                              ]
                            : []),
                        ...(secondary !== undefined &&
                        source.contains(secondary.node)
                            ? [
                                  {
                                      node: secondary.node,
                                      element: getNodeView(secondary.node),
                                      messages: [
                                          secondary.explanation(
                                              $locales,
                                              project.getNodeContext(
                                                  secondary.node,
                                              ),
                                          ),
                                      ],
                                      context,
                                      kind: 'secondary' as const,
                                  },
                              ]
                            : []),
                    ];
                })
                .flat();
        }

        // Now organize by node.
        annotationsByNode = new Map();
        for (const annotation of annotations)
            annotationsByNode.set(annotation.node, [
                annotation,
                ...(annotationsByNode.get(annotation.node) ?? []),
            ]);
    }

    function getStepView(): [Node | null, Element | null] {
        // Find the node corresponding to the step being rendered.
        const node = evaluator.getStepNode() ?? null;

        // Find the view of the node.
        let nodeView = node ? getNodeView(node) : null;

        // If we couldn't find a view for the node, it's probably because it was replaced by a value view.
        // Find the value corresponding to the node that just evaluated.
        if (nodeView === null) {
            const currentStep = evaluator.getCurrentStep();
            if (currentStep) {
                const firstExpression =
                    currentStep.node instanceof Expression
                        ? currentStep.node
                        : evaluator.project
                              .getRoot(currentStep.node)
                              ?.getAncestors(currentStep.node)
                              .find(
                                  (a): a is Expression =>
                                      a instanceof Expression,
                              );
                if (firstExpression) {
                    const value =
                        evaluator.getLatestExpressionValueInEvaluation(
                            firstExpression,
                        );
                    if (value)
                        nodeView = document.querySelector(
                            `.value[data-id="${value.id}"]`,
                        );
                }
            }
        }

        return [node, nodeView];
    }

    function getNodeView(node: Node) {
        return document.querySelector(
            `.editor .node-view[data-id="${node.id}"]`,
        );
    }
</script>

<!-- Render annotations by node -->
<section
    aria-label={$locales.get((l) => l.ui.annotations.label)}
    class:expanded
    on:pointerdown={() => {
        if (!expanded) expanded = true;
    }}
>
    <Expander
        {expanded}
        toggle={() => (expanded = !expanded)}
        vertical={false}
    />
    {#if expanded}
        {#if source.isEmpty()}
            <Speech glyph={Glyphs.Function} scroll={false} below>
                <svelte:fragment slot="content">
                    <MarkupHTMLView
                        markup={docToMarkup(
                            $locales.get((l) => l.ui.source.empty),
                        ).concretize($locales, [toShortcut(ShowMenu)]) ?? ''}
                    />
                </svelte:fragment>
            </Speech>
        {:else}
            <Speech glyph={Glyphs.Function} scroll={false} below>
                <svelte:fragment slot="content">
                    {#if stepping}
                        <MarkupHTMLView
                            inline
                            markup={$locales.get(
                                (l) => l.ui.annotations.evaluating,
                            )}
                        />
                    {:else if caretNode}
                        <div class="who">
                            <div class="intro">
                                <MarkupHTMLView
                                    inline
                                    markup={docToMarkup(
                                        $locales.get(
                                            (l) => l.ui.annotations.cursor,
                                        ),
                                    ).concretize($locales, [
                                        caretNode.getLabel($locales),
                                        caretNode instanceof Expression
                                            ? new NodeRef(
                                                  caretNode
                                                      .getType(context)
                                                      .generalize(context),
                                                  $locales,
                                                  context,
                                              )
                                            : undefined,
                                    ]) ?? ''}
                                />
                            </div>
                            {#if relevantConcept}
                                <div class="concept">
                                    <MarkupHTMLView
                                        inline
                                        markup={$locales.get(
                                            (l) => l.ui.annotations.learn,
                                        )}
                                    />
                                    <ConceptLinkUI
                                        link={relevantConcept}
                                        label={DOCUMENTATION_SYMBOL}
                                    />
                                </div>
                            {/if}
                            {#if adjustable}
                                <div class="tools">
                                    <CommandButton
                                        command={IncrementLiteral}
                                        {sourceID}
                                        background
                                    />
                                    <CommandButton
                                        command={DecrementLiteral}
                                        {sourceID}
                                        background
                                    />
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <MarkupHTMLView
                            inline
                            markup={$locales.get((l) => l.ui.annotations.space)}
                        />
                    {/if}
                </svelte:fragment>
            </Speech>
            {#each Array.from(annotationsByNode.values()) as annotations, index}
                <Annotation id={index} {annotations} />
            {/each}
        {/if}
    {:else}
        {#each annotations as annotation}
            <div class="annotation {annotation.kind}"></div>
        {/each}
    {/if}
</section>

<style>
    section {
        padding: var(--wordplay-spacing);
        overflow-y: auto;
        height: 100%;
        border-inline-start: solid var(--wordplay-border-width)
            var(--wordplay-border-color);
        max-width: 2em;
        min-width: 2em;
        transition:
            max-width calc(var(--animation-factor) * 100ms),
            min-width calc(var(--animation-factor) * 100ms);
    }

    section.expanded {
        max-width: 15em;
        min-width: 15em;
    }

    section:not(.expanded) {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--wordplay-spacing);
        cursor: pointer;
    }

    .who {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
    }

    .annotation {
        display: inline-block;
        width: var(--wordplay-focus-width);
        height: 1em;
        background: var(--wordplay-error);
        animation: spin ease-out calc(var(--animation-factor) * 100ms);
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        25% {
            transform: rotate(0deg);
        }
        50% {
            transform: rotate(360deg);
        }
        51% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(0deg);
        }
    }

    .annotation.step {
        background: var(--wordplay-evaluation-color);
    }

    .annotation.primary {
        background: var(--wordplay-error);
    }

    .annotation.secondary,
    .annotation.minor {
        background: var(--wordplay-warning);
    }
</style>

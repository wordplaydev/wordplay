<script context="module" lang="ts">
    export type AnnotationInfo = {
        node: Node;
        element: Element | null;
        messages: Markup[];
        kind: 'step' | 'primary' | 'secondary' | 'minor';
    };
</script>

<script lang="ts">
    import type Conflict from '@conflicts/Conflict';
    import Expression from '@nodes/Expression';
    import type Node from '@nodes/Node';
    import Annotation from './Annotation.svelte';
    import { tick } from 'svelte';
    import type Step from '@runtime/Step';
    import type Evaluator from '@runtime/Evaluator';
    import type Project from '../../models/Project';
    import { getEvaluation } from '../project/Contexts';
    import type Markup from '../../nodes/Markup';
    import concretize from '../../locale/concretize';
    import type Source from '../../nodes/Source';
    import { locale, locales } from '../../db/Database';

    export let project: Project;
    export let evaluator: Evaluator;
    /** The source who's annotations to show.*/
    export let source: Source;
    export let stepping: boolean;
    export let conflicts: Conflict[];

    let evaluation = getEvaluation();
    let annotations: AnnotationInfo[] = [];
    let annotationsByNode: Map<Node, AnnotationInfo[]> = new Map();

    // When current step or conflicts change, update the annotations.
    $: {
        if (stepping || conflicts) updateAnnotations();
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
                        messages: $evaluation?.step
                            ? $locales.map((locale) =>
                                  ($evaluation?.step as Step).getExplanations(
                                      locale,
                                      evaluator
                                  )
                              )
                            : evaluator.steppedToNode() && evaluator.isDone()
                            ? $locales.map((locale) =>
                                  concretize(
                                      locale,
                                      locale.node.Program.unevaluated
                                  )
                              )
                            : $locales.map((locale) =>
                                  concretize(locale, locale.node.Program.done)
                              ),
                        kind: 'step',
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
                                      messages: $locales.map((locale) =>
                                          primary.explanation(
                                              locale,
                                              project.getNodeContext(
                                                  primary.node
                                              ) ??
                                                  project.getContext(
                                                      project.main
                                                  )
                                          )
                                      ),
                                      kind: conflict.isMinor()
                                          ? ('minor' as const)
                                          : ('primary' as const),
                                  },
                              ]
                            : []),
                        ...(secondary !== undefined &&
                        source.contains(secondary.node)
                            ? [
                                  {
                                      node: secondary.node,
                                      element: getNodeView(secondary.node),
                                      messages: $locales.map((locale) =>
                                          secondary.explanation(
                                              locale,
                                              project.getNodeContext(
                                                  secondary.node
                                              )
                                          )
                                      ),
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
                                      a instanceof Expression
                              );
                if (firstExpression) {
                    const value =
                        evaluator.getLatestExpressionValueInEvaluation(
                            firstExpression
                        );
                    if (value)
                        nodeView = document.querySelector(
                            `.value[data-id="${value.id}"]`
                        );
                }
            }
        }

        return [node, nodeView];
    }

    function getNodeView(node: Node) {
        return document.querySelector(
            `.editor .node-view[data-id="${node.id}"]`
        );
    }
</script>

<!-- Render annotations by node -->
<section aria-label={$locale.ui.section.conflicts}>
    {#each Array.from(annotationsByNode.values()) as annotations, index}
        <Annotation id={index} {annotations} />
    {/each}
</section>

<style>
    section {
        max-height: 10em;
        overflow-y: scroll;
        width: 100%;
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }
</style>

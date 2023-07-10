<script context="module" lang="ts">
    export type AnnotationInfo = {
        node: Node;
        element: Element | null;
        text: Description[];
        kind: 'step' | 'primary' | 'secondary' | 'minor';
        position?: Position | undefined;
    };
</script>

<script lang="ts">
    import type Conflict from '@conflicts/Conflict';
    import Expression from '@nodes/Expression';
    import type Node from '@nodes/Node';
    import Annotation from './Annotation.svelte';
    import type Position from './Position';
    import { tick } from 'svelte';
    import type Step from '@runtime/Step';
    import type Evaluator from '@runtime/Evaluator';
    import type Project from '../../models/Project';
    import { getEvaluation } from '../project/Contexts';
    import { creator } from '../../db/Creator';
    import Description from '../../locale/Description';

    export let project: Project;
    export let evaluator: Evaluator;
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
            if (node)
                annotations = [
                    {
                        node: node,
                        element: view,
                        text: $evaluation?.step
                            ? $creator
                                  .getLocales()
                                  .map((locale) =>
                                      (
                                          $evaluation?.step as Step
                                      ).getExplanations(locale, evaluator)
                                  )
                            : evaluator.steppedToNode() && evaluator.isDone()
                            ? $creator
                                  .getLocales()
                                  .map((locale) =>
                                      Description.as(
                                          locale.node.Program.unevaluated
                                      )
                                  )
                            : $creator
                                  .getLocales()
                                  .map((locale) =>
                                      Description.as(locale.node.Program.done)
                                  ),
                        kind: 'step',
                        position: getPosition(view),
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
                        {
                            node: primary.node,
                            element: getNodeView(primary.node),
                            text: $creator
                                .getLocales()
                                .map((trans) =>
                                    primary.explanation(
                                        trans,
                                        project.getNodeContext(primary.node) ??
                                            project.getContext(project.main)
                                    )
                                ),
                            kind: conflict.isMinor()
                                ? ('minor' as const)
                                : ('primary' as const),
                        },
                        ...(secondary === undefined
                            ? []
                            : [
                                  {
                                      node: secondary.node,
                                      element: getNodeView(secondary.node),
                                      text: $creator
                                          .getLocales()
                                          .map((trans) =>
                                              secondary.explanation(
                                                  trans,
                                                  project.getNodeContext(
                                                      secondary.node
                                                  ) ??
                                                      project.getContext(
                                                          project.main
                                                      )
                                              )
                                          )
                                          .filter(
                                              (ex): ex is Description =>
                                                  ex !== undefined
                                          ),
                                      kind: 'secondary' as const,
                                  },
                              ]),
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

    // When the annotations positions change, update the positions to their default positions.
    $: {
        if (annotations) {
            annotations = annotations.map((annotation) => {
                annotation.position = getPosition(annotation.element);
                return annotation;
            });
        }
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

    function getPosition(nodeView: Element | null): Position | undefined {
        // Find the canvas
        const canvas = nodeView?.closest('.canvas');
        // Find the tile that contains the node
        const tile = nodeView?.closest('.content');

        if (nodeView && canvas && tile) {
            // Find the position of the node in the window.
            const nodeRect = nodeView.getBoundingClientRect();

            // Find the position of the tile it's in.
            const tileRect = tile.getBoundingClientRect();

            // If the bubble would be outside the bounds of the window, adjust it's position.
            return {
                left:
                    nodeRect.right < tileRect.left
                        ? tileRect.left
                        : nodeRect.left > tileRect.right
                        ? tileRect.right
                        : nodeRect.right + 1,
                top:
                    nodeRect.bottom < tileRect.top
                        ? tileRect.top
                        : nodeRect.bottom > tileRect.bottom
                        ? tileRect.bottom
                        : nodeRect.bottom + 1,
            };
        }
        // If we couldn't find a view, put it in the corner of the editor.
        else return undefined;
    }
</script>

<!-- Render annotations by node -->
<section
    class="annotations"
    aria-label={$creator.getLocale().ui.section.conflicts}
>
    {#each Array.from(annotationsByNode.values()) as annotations, index}
        <Annotation id={index} {annotations} />
    {/each}
</section>

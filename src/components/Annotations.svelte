<script lang="ts">
    import type Conflict from "../conflicts/Conflict";
    import type Project from "../models/Project";
    import { currentStep } from "../models/stores";
    import { languages } from "../models/languages";
    import Expression from "../nodes/Expression";
    import type Node from "../nodes/Node";
    import { selectTranslation } from "../nodes/Translations";
    import Annotation from "./Annotation.svelte";
    import type Position from "./Position";
    import { tick } from "svelte";

    export let project: Project;
    export let stepping: boolean;
    export let conflicts: Conflict[];
    export let scrollposition: Position | undefined;

    $: evaluator = project.evaluator;
    type Place = { element: Element | null, text: string, kind: "step" | "primary" | "secondary", position?: Position | undefined };

    let annotations: Place[] = [];
    let windowWidth: number;
    let windowHeight: number;

    // When current step or conflicts change, update the annotations.
    $: {
        if(stepping || conflicts)
            updateAnnotations();
    }

    async function updateAnnotations() {

        // Wait for DOM updates so that everything is in position before we layout annotations.
        await tick();

        annotations = [];
        if(stepping) {

            const view = getStepView();

            // Return a singl annotation for the step.
            annotations = [
                {
                    element: view,
                    text: $currentStep ? $currentStep.getExplanations(project.evaluator)[$languages[0]] :
                        project.evaluator.steppedToNode() && project.evaluator.isDone() ? "The selected node didn't evaluate." :
                        "Done evaluating",
                    kind: "step",
                    position: getPosition(view)
                }
            ]

        } else {
            // Conflict all of the active conflicts to a list of annotations.
            annotations = conflicts.map((conflict: Conflict) => {
                const conflictNodes = conflict.getConflictingNodes();
                // Based on the primary and secondary nodes given, decide what to show.
                // We expect
                // 1) a single primary node
                // 2) zero or more secondary nodes
                // From these, we generate one or two speech bubbles to illustrate the conflict.
                return [
                    {
                        element: getNodeView(conflictNodes.primary),
                        text: selectTranslation(conflict.getPrimaryExplanation(project.getNodeContext(conflictNodes.primary) ?? project.getContext(project.main)), $languages),
                        kind: "primary" as const
                    },
                    ...conflictNodes.secondary.map((secondary: Node) => {
                        return {
                            element: getNodeView(secondary),
                            text: selectTranslation(conflict.getSecondaryExplanation(project.getNodeContext(secondary) ?? project.getContext(project.main)), $languages),
                            kind: "secondary" as const
                        }
                    })
                ];
            }).flat();

        }
    }

    // When the annotations or editor scroll position change, update the positions
    $: { 
        if(annotations && scrollposition && windowWidth && windowHeight)
            annotations = annotations.map(annotation => { 
                annotation.position = getPosition(annotation.element);
                return annotation;
            });
    }

    function getStepView() {

        // Find the node corresponding to the step being rendered.
        const node = evaluator.getStepNode();

        // Find the view of the node.
        let nodeView = node ? getNodeView(node) : null;

        // If we couldn't find a view for the node, it's probably because it was replaced by a value view.
        // Find the value corresponding to the node that just evaluated.
        if(nodeView === null) {
            const currentStep = evaluator.getCurrentStep();
            if(currentStep) {
                const firstExpression = 
                    currentStep.node instanceof Expression ? currentStep.node : evaluator.project.get(currentStep.node)?.getAncestors().find((a): a is Expression => a instanceof Expression);
                if(firstExpression) {
                    const value = evaluator.getLatestValueOf(firstExpression);
                    if(value)
                        nodeView = document.querySelector(`.value[data-id="${value.id}"]`);
                }
            }
        }

        return nodeView;

    }

    function getNodeView(node: Node) {
        return document.querySelector(`.node-view[data-id="${node.id}"]`)
    }

    function getPosition(view: Element | null): Position | undefined {

        // If there's no view, it's likely native code, so pick some generic place, like centered at the top of the screen
        if(view && scrollposition) {

            // Find the position of the node.
            const rect = view.getBoundingClientRect();

            // If the bubble would be outside the bounds of the window, adjust it's position.
            if(rect.right - scrollposition.left < 0) return undefined;
            if(rect.right - scrollposition.left > windowWidth) return undefined;
            if(rect.bottom - scrollposition.top < 0) return undefined;
            if(rect.bottom - scrollposition.top > windowHeight) return undefined;

            return { left: rect.right, top: rect.bottom }
        }
        // If we couldn't find a view, put it in the corner of the editor.
        else {
            console.log("No view of...")
            console.log(view);
            return { left: 0, top: 0};
        }

    }

</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

{#each annotations as annotation}
    {#if annotation.position}
        <Annotation text={annotation.text} position={annotation.position} kind={annotation.kind} />
    {/if}
{/each}
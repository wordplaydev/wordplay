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
    import { afterUpdate } from "svelte";
    import type Rect from "./Rect";

    export let project: Project;
    export let stepping: boolean;
    export let conflicts: Conflict[];
    export let viewport: Rect | undefined;

    $: evaluator = project.evaluator;
    type Annotation = { node: Node, element: Element | null, text: string, kind: "step" | "primary" | "secondary", position?: Position | undefined };

    let annotations: Annotation[] = [];

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

            const [ node, view ] = getStepView();

            // Return a singl annotation for the step.
            if(node)
                annotations = [
                    {
                        node: node,
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
                        node: conflictNodes.primary,
                        element: getNodeView(conflictNodes.primary),
                        text: selectTranslation(conflict.getPrimaryExplanation(project.getNodeContext(conflictNodes.primary) ?? project.getContext(project.main)), $languages),
                        kind: "primary" as const
                    },
                    ...conflictNodes.secondary.map((secondary: Node) => {
                        return {
                            node: secondary,
                            element: getNodeView(secondary),
                            text: selectTranslation(conflict.getSecondaryExplanation(project.getNodeContext(secondary) ?? project.getContext(project.main)), $languages),
                            kind: "secondary" as const
                        }
                    })
                ];
            }).flat();

        }
    }

    // When the annotations or editor scroll position change, update the positions to their default positions.
    $: { 
        if(annotations && viewport)
            annotations = annotations.map(annotation => { 
                annotation.position = getPosition(annotation.element);
                return annotation;
            });
    }


    type Box = { left: number, top: number, right: number, bottom: number, width: number, height: number };
    // After the annotations are rendered, resolve layout conflicts now that we know they're size.
    afterUpdate(() => {

        // Find all of the annotation views
        const views = document.querySelectorAll(".annotation");

        // Compute all of their bounding boxes.
        const annotationViews = new Map<Annotation, HTMLElement>();
        const annotationRects = new Map<Annotation, Box>();
        for(const view of views) {
            const id = (view as HTMLElement).dataset.annotationid;
            const annotation = id === undefined ? undefined : annotations[parseInt(id)];
            if(annotation && annotation.position) {
                const rect = domRectToRect(view.getBoundingClientRect());
                // Reset the position to the starting position, just reusing the dimensions,
                // so every time we rerender, we're starting from the same starting position.
                annotationRects.set(annotation, {
                    left: annotation.position.left,
                    top: annotation.position.top,
                    right: annotation.position.left + rect.width,
                    bottom: annotation.position.top + rect.height,
                    width: rect.width,
                    height: rect.height
                });
                annotationViews.set(annotation, view as HTMLElement);
            }
        }

        // Find all of the node views in the editor
        const nodeRects = new Map<number, Box>();
        for(const annotation of annotations) {
            const nodeView = getNodeView(annotation.node);
            if(nodeView) {
                nodeRects.set(annotation.node.id, domRectToRect(nodeView.getBoundingClientRect()));
            }
        }

        // For each annotation, see it overlaps with a node and move it out of the way.
        for(const annotation of annotations) {
            const annotationRect = annotationRects.get(annotation);
            if(annotationRect === undefined) continue;            
            for(const nodeRect of nodeRects.values())
                adjustPosition(annotationRect, nodeRect);
        }

        // Then, for each anontation, see it overlaps with other annotations or annotated code, and move it if it does.
        for(const annotation of annotations) {
            const annotationRect = annotationRects.get(annotation);
            if(annotationRect === undefined) continue;            
            for(const [ otherAnnotation, otherAnnotationRect ] of annotationRects.entries())
                if(otherAnnotation !== annotation)
                    adjustPosition(annotationRect, otherAnnotationRect);
        }

        // Update the annotations based on the new rect positions.
        for(const [ annotation, view ] of annotationViews) {
            const rect = annotationRects.get(annotation);
            if(rect) {
                view.style.left = `${rect.left}px`;
                view.style.top = `${rect.top}px`;
            }
        }

    });

    function domRectToRect(rect: DOMRect) {
        return { left: rect.left, top: rect.top, bottom: rect.bottom, right: rect.right, width: rect.width, height: rect.height };
    }

    function adjustPosition(primary: Box, other: Box) {

        // If no overlap, do nothing.
        if(primary.left > other.right || other.left > primary.right) return;
        if(primary.top > other.bottom || other.top > primary.bottom) return;

        // Shift it up from its current position to prevent overlap.
        primary.top = other.top - primary.height;
        primary.bottom = primary.top + primary.height;

    }

    function getStepView(): [ Node | null, Element | null ] {

        // Find the node corresponding to the step being rendered.
        const node = evaluator.getStepNode() ?? null;

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

        return [ node, nodeView ];

    }

    function getNodeView(node: Node) {
        return document.querySelector(`.node-view[data-id="${node.id}"]`)
    }

    function getPosition(view: Element | null): Position | undefined {

        // If there's no view, it's likely native code, so pick some generic place, like centered at the top of the screen
        if(view && viewport) {

            // Find the position of the node.
            const rect = view.getBoundingClientRect();

            // If the bubble would be outside the bounds of the window, adjust it's position.
            return { 
                left:   rect.right < 0 ? 0 :
                        rect.right > viewport.width ? viewport.width :
                        rect.right,
                top:    rect.bottom < 0 ? 0 :
                        rect.bottom > viewport.height ? viewport.height :
                        rect.bottom 
            }
        }
        // If we couldn't find a view, put it in the corner of the editor.
        else {
            return { left: 0, top: 0};
        }

    }

</script>

{#each annotations as annotation, index}
    {#if annotation.position}
        <Annotation id={index} text={annotation.text} position={annotation.position} kind={annotation.kind} />
    {/if}
{/each}
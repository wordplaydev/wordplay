<script module lang="ts">
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
    import type Project from '../../db/projects/Project';
    import { getConceptIndex, getEvaluation } from '../project/Contexts';
    import type Markup from '../../nodes/Markup';
    import type Source from '../../nodes/Source';
    import { locales, Settings, showAnnotations } from '../../db/Database';
    import Speech from '@components/lore/Speech.svelte';
    import Glyphs from '../../lore/Glyphs';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { docToMarkup } from '@locale/LocaleText';
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
    import Templates from '@concepts/Templates';

    interface Props {
        /** The project for which annotations should be shown */
        project: Project;
        /** The evaluator running the program */
        evaluator: Evaluator;
        /** The source who's annotations to show.*/
        source: Source;
        /** The source ID of the source */
        sourceID: string;
        /** Whether we're stepping */
        stepping: boolean;
        /** Conflicts to show */
        conflicts: Conflict[];
        /** The caret of the editor this is annotating */
        caret: Caret | undefined;
    }

    let {
        project,
        evaluator,
        source,
        sourceID,
        stepping,
        conflicts,
        caret,
    }: Props = $props();

    let evaluation = getEvaluation();

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    let annotations: AnnotationInfo[] = $state([]);
    let annotationsByNode: Map<Node, AnnotationInfo[]> = $state(new Map());

    async function updateAnnotations() {
        // Wait for DOM updates so that everything is in position before we layout annotations.
        await tick();

        // Reset the annotation list to active annotations.
        annotations = conflicts
            .map((conflict: Conflict) => {
                const nodes = conflict.getConflictingNodes(context, Templates);
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
                        messages: [
                            primary.explanation(
                                $locales,
                                project.getNodeContext(primary.node) ??
                                    project.getContext(project.getMain()),
                            ),
                        ],
                        kind: conflict.isMinor()
                            ? ('minor' as const)
                            : ('primary' as const),
                        context,
                        // Place the resolutions in the primary node.
                        resolutions: nodes.resolutions,
                    },
                    ...(secondary !== undefined
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

        // If stepping, add the current evaluation.
        if (stepping) {
            const [node, view] = getStepView();

            // Return a single annotation for the step.
            if (node && source.contains(node))
                annotations = [
                    ...annotations,
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
                                  ? $locales.concretize(
                                        (l) => l.node.Program.unevaluated,
                                    )
                                  : $locales.concretize(
                                        (l) => l.node.Program.done,
                                    ),
                        ],
                        kind: 'step',
                        context,
                    },
                ];
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
            const value = evaluator.getCurrentValue();
            if (value) {
                nodeView = document.querySelector(
                    `.value[data-id="${value.id}"]`,
                );
            }
        }

        return [node, nodeView];
    }

    function getNodeView(node: Node) {
        return document.querySelector(
            `.editor .node-view[data-id="${node.id}"]`,
        );
    }
    let caretNode = $derived(
        caret
            ? caret.position instanceof Node
                ? caret.position
                : caret.tokenExcludingSpace
            : undefined,
    );
    let context = $derived(project.getContext(source));
    let relevantConcept = $derived(
        index && caret && caret.position instanceof Node
            ? index?.getRelevantConcept(caret.position)
            : undefined,
    );
    let caretNodeParent = $derived(
        caretNode instanceof Node ? caretNode.getParent(context) : undefined,
    );
    let relevantParentConcept = $derived(
        index && caretNodeParent
            ? index?.getRelevantConcept(caretNodeParent)
            : undefined,
    );
    // See if the caret is adjustable.
    let adjustable = $derived(
        caret && caretNode ? caret.getAdjustableLiteral() : undefined,
    );

    // When any of these states change, update annotations.
    $effect(() => {
        stepping;
        conflicts;
        $evaluation;
        updateAnnotations();
    });
</script>

<!-- Render annotations by node -->
<section
    aria-label={$locales.get((l) => l.ui.annotations.label)}
    class:expanded={$showAnnotations}
    data-uiid="conflict"
    onpointerdown={() => {
        if (!$showAnnotations) Settings.setShowAnnotations(true);
    }}
>
    <Expander
        expanded={$showAnnotations}
        toggle={() => Settings.setShowAnnotations(!$showAnnotations)}
        vertical={false}
    />
    {#if $showAnnotations}
        <div class="annotations">
            {#if source.isEmpty()}
                <Speech glyph={Glyphs.Function} scroll={false} below>
                    {#snippet content()}
                        <MarkupHTMLView
                            markup={docToMarkup(
                                $locales.get((l) => l.ui.source.empty),
                            ).concretize($locales, [toShortcut(ShowMenu)]) ??
                                ''}
                        />
                    {/snippet}
                </Speech>
            {:else}
                {#each Array.from(annotationsByNode.values()) as annotations, index}
                    <Annotation id={index} {annotations} />
                {/each}
                <Speech glyph={Glyphs.Function} scroll={false} below>
                    {#snippet content()}
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
                                {#if caretNodeParent}
                                    <div class="intro">
                                        <MarkupHTMLView
                                            inline
                                            markup={docToMarkup(
                                                $locales.get(
                                                    (l) =>
                                                        l.ui.annotations
                                                            .cursorParent,
                                                ),
                                            ).concretize($locales, [
                                                caretNodeParent.getLabel(
                                                    $locales,
                                                ),
                                                caretNodeParent instanceof
                                                Expression
                                                    ? new NodeRef(
                                                          caretNodeParent
                                                              .getType(context)
                                                              .generalize(
                                                                  context,
                                                              ),
                                                          $locales,
                                                          context,
                                                      )
                                                    : undefined,
                                            ]) ?? ''}
                                        />
                                    </div>
                                    {#if relevantParentConcept}
                                        <div class="concept">
                                            <MarkupHTMLView
                                                inline
                                                markup={$locales.get(
                                                    (l) =>
                                                        l.ui.annotations.learn,
                                                )}
                                            />
                                            <ConceptLinkUI
                                                link={relevantParentConcept}
                                                label={DOCUMENTATION_SYMBOL}
                                            />
                                        </div>
                                    {/if}
                                {/if}
                            </div>
                        {:else}
                            <MarkupHTMLView
                                inline
                                markup={$locales.get(
                                    (l) => l.ui.annotations.space,
                                )}
                            />
                        {/if}
                    {/snippet}
                </Speech>
            {/if}
        </div>
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

    section:not(:global(.expanded)) {
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

    .annotations {
        display: flex;
        flex-direction: column;
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

<script module lang="ts">
    /**
     * Resolutions are exposed as a thunk so the (potentially expensive) inference
     * inside {@link Conflict.getResolutions} only runs when an annotation is actually
     * rendered — see Annotation.svelte's `$derived` wrapper.
     */
    export type AnnotationInfo = {
        node: Node;
        element: Element | null;
        /** Resolvers for each message, called per chosen locale so the annotation can
         *  echo its explanation in every selected language. */
        messages: ((locales: Locales) => Markup)[];
        kind: 'step' | 'major' | 'minor';
        context: Context;
        /**
         * A thunk that returns the conflict's resolutions. `readonly Resolution[]`
         * lets us accept both the non-empty `Resolutions` tuple from new
         * conflicts and any plain array shape from intermediate code.
         */
        resolutions: () => readonly Resolution[];
        conflict?: ConflictLocaleAccessor;
    };
</script>

<script lang="ts">
    import ConceptLinkUI from '@components/concepts/ConceptLinkUI.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        DecrementLiteral,
        IncrementLiteral,
        ShowMenu,
        toShortcut,
    } from '@components/editor/commands/Commands';
    import Speech from '@components/lore/Speech.svelte';
    import CommandButton from '@components/widgets/CommandButton.svelte';
    import Sidebar from '@components/widgets/Sidebar.svelte';
    import Templates from '@concepts/Templates';
    import type Conflict from '@conflicts/Conflict';
    import type {
        ConflictLocaleAccessor,
        Resolution,
    } from '@conflicts/Conflict';
    import type Caret from '@edit/caret/Caret';
    import NodeRef from '@locale/NodeRef';
    import Context from '@nodes/Context';
    import Expression from '@nodes/Expression';
    import Node from '@nodes/Node';
    import Token from '@nodes/Token';
    import { DOCUMENTATION_SYMBOL } from '@parser/Symbols';
    import type Evaluator from '@runtime/Evaluator';
    import type Step from '@runtime/Step';
    import { onDestroy, tick } from 'svelte';
    import {
        locales,
        Settings,
        showAnnotations,
        annotationsWidth,
    } from '@db/Database';
    import {
        ANNOTATIONS_MIN_WIDTH,
        ANNOTATIONS_MAX_WIDTH,
    } from '@db/settings/AnnotationsSetting';
    import type Project from '@db/projects/Project';
    import Characters from '../../lore/BasisCharacters';
    import type Locales from '@locale/Locales';
    import type Markup from '@nodes/Markup';
    import type Source from '@nodes/Source';
    import {
        getConceptIndex,
        getEditors,
        getEmphasizedConflict,
        getEvaluation,
    } from '@components/project/Contexts';
    import Annotation from '@components/annotations/Annotation.svelte';

    interface Props {
        /** The project for which annotations should be shown */
        project: Project;
        /** The evaluator running the program, if any */
        evaluator: Evaluator | undefined;
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
        /** Optional local expanded override — when provided, ignores the global showAnnotations setting */
        expanded?: boolean | undefined;
        /** Optional toggle callback — when provided, called instead of the global Settings toggle */
        onToggle?: (() => void) | undefined;
    }

    let {
        project,
        evaluator,
        source,
        sourceID,
        stepping,
        conflicts,
        caret,
        expanded = undefined,
        onToggle = undefined,
    }: Props = $props();

    let isExpanded = $derived(
        expanded !== undefined ? expanded : $showAnnotations,
    );
    let toggle = $derived(
        onToggle !== undefined
            ? onToggle
            : () => Settings.setShowAnnotations(!$showAnnotations),
    );

    let evaluation = getEvaluation();

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    /** Conflicts (and the optional evaluation step), each with a stable key,
     *  sorted by order of appearance in the source. */
    let annotations: { info: AnnotationInfo; key: string }[] = $state([]);
    /** Per-conflict expanded state, keyed by a stable per-node key. Preserved
     *  across re-analysis; a newly-seen conflict defaults to expanded only when
     *  it's the sole conflict in this source. */
    let expandedByKey: Map<string, boolean> = $state(new Map());

    /** Whether any real conflicts (not just the evaluation step) are showing. */
    let hasConflicts = $derived(
        annotations.some(({ info }) => info.kind !== 'step'),
    );

    function toggleExpanded(key: string) {
        const next = new Map(expandedByKey);
        next.set(key, !(next.get(key) ?? false));
        expandedByKey = next;
    }

    // Get the editor this corresponds to.
    const editors = getEditors();
    let editor = $derived($editors?.get(sourceID));

    // Drives the wiggle on collapsed-sidebar conflict bars (the expanded rows
    // wiggle via Annotation.svelte's own subscription).
    const emphasizedConflict = getEmphasizedConflict();

    // Set when the component is destroyed, so the async updateAnnotations below can bail out after
    // its `await` instead of reading now-destroyed reactive props (e.g. when the tutorial recreates
    // its ProjectView on navigation), which triggers Svelte's derived_inert warning.
    let destroyed = false;
    onDestroy(() => (destroyed = true));

    async function updateAnnotations() {
        // Wait for DOM updates so that everything is in position before we layout annotations.
        await tick();
        if (destroyed) return;

        // Filter conflicts to those relevant to the source.
        const sourceConflicts: Conflict[] = [];
        const seen = new Set<Conflict>();
        for (const [node, conflicts] of project.getConflictedNodes()) {
            if (source.root.has(node)) {
                for (const conflict of conflicts) {
                    if (!seen.has(conflict)) {
                        seen.add(conflict);
                        sourceConflicts.push(conflict);
                    }
                }
            }
        }

        // Map source conflicts to annotation infos.
        const infos: AnnotationInfo[] = sourceConflicts.map(
            (conflict: Conflict) => {
                // getMessage is cheap (no inference) — explanation needed eagerly for the speech bubble.
                // Resolutions are wrapped in a thunk and only computed when the annotation renders.
                const nodes = conflict.getMessage(context, Templates);
                const messageContext =
                    project.getNodeContext(nodes.node) ??
                    project.getContext(project.getMain());
                return {
                    node: nodes.node,
                    element: getNodeView(nodes.node),
                    messages: [
                        (locales: Locales) =>
                            nodes.explanation(locales, messageContext),
                    ],
                    kind: conflict.isMinor()
                        ? ('minor' as const)
                        : ('major' as const),
                    context,
                    resolutions: () =>
                        conflict.getResolutions(context, Templates),
                    conflict: conflict.getLocalePath(),
                };
            },
        );

        // Sort by order of appearance in the source (the conflict node's first
        // position). Analysis order is usually but not always source order.
        const positions = new Map<AnnotationInfo, number>();
        for (const info of infos)
            positions.set(info, source.getNodeFirstPosition(info.node) ?? 0);
        infos.sort(
            (a, b) => (positions.get(a) ?? 0) - (positions.get(b) ?? 0),
        );

        // Assign a stable key per conflict (node id + per-node occurrence) so
        // expanded state survives re-analysis.
        const perNodeCount = new Map<number, number>();
        const keyed = infos.map((info) => {
            const n = perNodeCount.get(info.node.id) ?? 0;
            perNodeCount.set(info.node.id, n + 1);
            return { info, key: `${info.node.id}#${n}` };
        });

        // If stepping, add the current evaluation as a non-collapsible step.
        if (stepping && evaluator) {
            const [node, view] = getStepView();
            if (node && source.contains(node))
                keyed.push({
                    info: {
                        node: node,
                        element: view,
                        messages: [
                            (locales: Locales) =>
                                $evaluation?.step
                                    ? (
                                          $evaluation?.step as Step
                                      ).getExplanations(locales, evaluator)
                                    : evaluator.steppedToNode() &&
                                        evaluator.isDone()
                                      ? locales.concretize(
                                            (l) => l.node.Program.unevaluated,
                                        )
                                      : locales.concretize(
                                            (l) => l.node.Program.done,
                                        ),
                        ],
                        kind: 'step',
                        context,
                        resolutions: () => [],
                    },
                    key: 'step',
                });
        }

        // Recompute expanded state: preserve existing toggles; a newly-seen
        // conflict defaults to expanded only when it's the sole conflict.
        const soleConflict = infos.length === 1;
        const nextExpanded = new Map<string, boolean>();
        for (const { info, key } of keyed) {
            if (info.kind === 'step') continue;
            nextExpanded.set(key, expandedByKey.get(key) ?? soleConflict);
        }
        expandedByKey = nextExpanded;

        annotations = keyed;
    }

    function getStepView(): [Node | null, Element | null] {
        if (!evaluator) return [null, null];
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
    // The `caret` prop is wired to EditorState.displayedCaret in ProjectView,
    // so it already lags during rapid input flurries — no debouncing needed
    // here. caretNode et al. recompute only when displayedCaret changes.
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

    /** Expand the sidebar (if collapsed) and expand a specific conflict. */
    function expandConflict(key: string, node: Node) {
        if (!isExpanded) toggle();
        const next = new Map(expandedByKey);
        next.set(key, true);
        expandedByKey = next;
        editor?.setCaretPosition(node);
    }
</script>

<!-- The shared sidebar shell owns the frame, resize, toggle, and tooltip; the
     conflict/caret content lives in the snippets below. -->
<Sidebar
    side="end"
    expanded={isExpanded}
    {toggle}
    width={$annotationsWidth}
    min={ANNOTATIONS_MIN_WIDTH}
    max={ANNOTATIONS_MAX_WIDTH}
    commit={(width) => Settings.setAnnotationsWidth(width)}
    label={(l) => l.ui.annotations.label}
    toggleLabel={(l) => l.ui.annotations.button.toggle}
    uiid="conflict"
>
    {#snippet expandedContent()}
        <div class="annotations">
            {#if source.isEmpty()}
                <Speech
                    character={Characters.FunctionDefinition}
                    scroll={false}
                    below
                >
                    {#snippet content()}
                        <MarkupHTMLView
                            markup={[
                                (l) => l.ui.source.empty,
                                { symbol: toShortcut(ShowMenu) },
                            ]}
                        />
                    {/snippet}
                </Speech>
            {:else if !hasConflicts}
                <!-- Hide the caret description while conflicts are showing so the
                     list stays scannable. -->
                <Speech
                    character={Characters.FunctionDefinition}
                    scroll={false}
                    below
                >
                    {#snippet content()}
                        {#if stepping}
                            <MarkupHTMLView
                                inline
                                markup={(l) => l.ui.annotations.evaluating}
                            />
                        {:else if caretNode}
                            <div class="who">
                                <div class="intro">
                                    <MarkupHTMLView
                                        inline
                                        markup={[
                                            (l) => l.ui.annotations.cursor,
                                            {
                                                node: caretNode.getLabel(
                                                    $locales,
                                                ),
                                                type:
                                                    caretNode instanceof
                                                    Expression
                                                        ? new NodeRef(
                                                              caretNode
                                                                  .getType(
                                                                      context,
                                                                  )
                                                                  .generalize(
                                                                      context,
                                                                  )
                                                                  .simplify(
                                                                      context,
                                                                  ),
                                                              $locales,
                                                              context,
                                                          )
                                                        : undefined,
                                                description: !(
                                                    caretNode instanceof Token
                                                )
                                                    ? caretNode
                                                          .getDescription(
                                                              $locales,
                                                              context,
                                                          )
                                                          .toText()
                                                    : undefined,
                                            },
                                        ]}
                                    />
                                </div>
                                {#if relevantConcept}
                                    <div class="concept">
                                        <MarkupHTMLView
                                            inline
                                            markup={(l) =>
                                                l.ui.annotations.learn}
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
                                            markup={[
                                                (l) =>
                                                    l.ui.annotations
                                                        .cursorParent,
                                                {
                                                    node: caretNodeParent.getLabel(
                                                        $locales,
                                                    ),
                                                    type:
                                                        caretNodeParent instanceof
                                                        Expression
                                                            ? new NodeRef(
                                                                  caretNodeParent
                                                                      .getType(
                                                                          context,
                                                                      )
                                                                      .generalize(
                                                                          context,
                                                                      ),
                                                                  $locales,
                                                                  context,
                                                              )
                                                            : undefined,
                                                },
                                            ]}
                                        />
                                    </div>
                                    {#if relevantParentConcept}
                                        <div class="concept">
                                            <MarkupHTMLView
                                                inline
                                                markup={(l) =>
                                                    l.ui.annotations.learn}
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
                                markup={(l) => l.ui.annotations.space}
                            />
                        {/if}
                    {/snippet}
                </Speech>
            {/if}
            {#if !hasConflicts && annotations.length > 0}
                <hr />
            {/if}
            {#each annotations as { info, key } (key)}
                <Annotation
                    annotation={info}
                    expanded={info.kind === 'step' ||
                        (expandedByKey.get(key) ?? false)}
                    onToggle={() => toggleExpanded(key)}
                    {sourceID}
                />
            {/each}
        </div>
    {/snippet}
    {#snippet collapsedContent()}
        {#each annotations as { info, key } (key)}
            <div
                role="button"
                tabindex="0"
                title={$locales.getPlainText(
                    (l) => l.ui.annotations.button.highlight,
                )}
                aria-label={$locales.getPlainText(
                    (l) => l.ui.annotations.button.highlight,
                )}
                onclick={() => expandConflict(key, info.node)}
                onkeydown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        expandConflict(key, info.node);
                    }
                }}
                class="annotation {info.kind}"
                class:wiggle={$emphasizedConflict?.origin === 'editor' &&
                    $emphasizedConflict?.node === info.node}
            ></div>
        {/each}
    {/snippet}
</Sidebar>

<style>
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
        /* Spacing after the expand/collapse arrow above. */
        margin-block-start: var(--wordplay-spacing);
        /* Long resolution text wraps onto multiple lines; long unbreakable runs
           (e.g. literal text in a union enumeration) break at any character. */
        word-wrap: break-word;
        overflow-wrap: anywhere;
    }

    .annotation {
        display: inline-block;
        width: calc(2 * var(--wordplay-focus-width));
        height: 1em;
        background: var(--wordplay-error);
        animation: spin ease-out calc(var(--animation-factor) * 100ms);
        cursor: pointer;
    }

    /* Hover feedback on the collapsed-sidebar conflict bars. */
    .annotation:hover {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
    }

    /* Wiggle a collapsed conflict bar while the caret is over its conflict,
       mirroring the expanded rows and the editor underline. Reuses the global
       `shake` keyframe for a sharper motion. */
    .annotation.wiggle {
        animation: shake calc(var(--animation-factor) * 500ms) linear infinite;
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

    .annotation.major {
        background: var(--wordplay-error);
    }

    .annotation.minor {
        background: var(--wordplay-warning);
    }
</style>

<script lang="ts">
    import {
        getEditors,
        getEmphasizedConflict,
    } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type {
        ConflictLocaleAccessor,
        Resolution,
    } from '@conflicts/Conflict';
    import type Context from '@nodes/Context';
    import { setDialogInURL } from '@components/widgets/dialogURL';
    import { CONFIRM_SYMBOL, DOCUMENTATION_SYMBOL } from '@parser/Symbols';
    import { fade } from 'svelte/transition';
    import { get } from 'svelte/store';
    import { animationDuration, locales } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import { default as MarkupHTMLView } from '@components/concepts/MarkupHTMLView.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import getFocusNode from '@components/annotations/getFocusNode';
    import type { AnnotationInfo } from '@components/annotations/Annotations.svelte';

    interface Props {
        annotation: AnnotationInfo;
        /** Whether this conflict is expanded (only meaningful for conflicts, not steps) */
        expanded: boolean;
        /** Toggle this conflict's expanded state */
        onToggle: () => void;
        /** Whether the source is editable; false hides repair resolutions */
        editable?: boolean;
        /** The tile ID this corresponds to */
        sourceID: string;
    }

    let {
        annotation,
        expanded,
        onToggle,
        editable = true,
        sourceID,
    }: Props = $props();

    // Get the editor this corresponds to.
    const editors = getEditors();
    let editor = $derived($editors?.get(sourceID));

    const emphasizedConflict = getEmphasizedConflict();

    /** True for the evaluation-step annotation, which is always shown expanded and isn't interactive. */
    let isStep = $derived(annotation.conflict === undefined);

    /** The primary-locale severity word, so a conflict row's accessible name
     *  carries what its bar color alone can't. */
    let severityWord = $derived(
        $locales.getPrimaryPlainText((l) =>
            annotation.kind === 'minor'
                ? l.ui.annotations.severity.minor
                : l.ui.annotations.severity.major,
        ),
    );

    let root: HTMLElement | undefined = $state();

    /** Wiggle (infinitely) while the caret is over this conflict in the editor,
     *  but only while collapsed — an expanded conflict is already visible, and
     *  expanding via click (which moves the caret here) shouldn't wiggle it.
     *  We only react to editor-origin emphasis (sidebar-origin is us telling the
     *  editor), which avoids a feedback loop. */
    let wiggling = $derived(
        !isStep &&
            !expanded &&
            $emphasizedConflict?.origin === 'editor' &&
            $emphasizedConflict?.node === annotation.node,
    );

    // Scroll this row into view once when the caret lands on it (keyed on nonce).
    let lastScrollNonce: number | undefined = undefined;
    $effect(() => {
        const emphasis = $emphasizedConflict;
        if (
            emphasis === undefined ||
            emphasis.origin !== 'editor' ||
            emphasis.node !== annotation.node ||
            emphasis.nonce === lastScrollNonce
        )
            return;
        lastScrollNonce = emphasis.nonce;
        root?.scrollIntoView({ block: 'nearest' });
    });

    /** Emphasize this conflict in the editor (scroll to + wiggle its underline). */
    function emphasize() {
        if (emphasizedConflict === undefined || isStep) return;
        const current = get(emphasizedConflict);
        emphasizedConflict.set({
            node: annotation.node,
            origin: 'sidebar',
            nonce: (current?.nonce ?? 0) + 1,
        });
    }

    /** Drop our own emphasis when the pointer/focus leaves, without clobbering another row's. */
    function deemphasize() {
        if (emphasizedConflict === undefined) return;
        const current = get(emphasizedConflict);
        if (current?.origin === 'sidebar' && current.node === annotation.node)
            emphasizedConflict.set(undefined);
    }

    /** Toggle from a click, ignoring clicks on interactive children (concept
     *  links, resolution buttons) inside the expanded bubble. */
    function handleClick(event: MouseEvent) {
        if (
            event.target instanceof Element &&
            event.target.closest('button, a, input')
        )
            return;
        toggle();
    }

    function toggle() {
        // A resolution may point somewhere other than the node the conflict is reported on.
        const focus = getFocusNode(annotation.resolutions(), annotation.node);
        // When expanding, reveal the node by moving the caret to it (without
        // stealing keyboard focus from this conflict).
        if (!expanded && editor) editor.setCaretPosition(focus);
        // Always scroll the editor to this conflict on click — regardless of
        // whether it's already selected, being collapsed, or was hovered first.
        // (A node selection from setCaretPosition doesn't auto-scroll, and the
        // hover-emphasis path is inconsistent.)
        editor?.revealNode(focus);
        onToggle();
    }

    /** Apply a repair: run the mediator, select what it produced, swap the project. */
    function resolveAnnotation(
        resolution: Extract<Resolution, { kind: 'repair' }>,
        context: Context,
    ) {
        const { newProject, newNode } = resolution.mediator(context, $locales);
        // Select the code the repair produced, not the node it replaced — that one isn't in the tree
        // any more, and a caret pointing at it selects nothing. A repair that names its edited node
        // wins, since it's the most precise (the placeholder inside a rebuilt parent, say); otherwise
        // withRevisedNodes already recorded where the edit landed, which is the replacement node, or
        // the position a removed node used to occupy.
        const newSource =
            newProject.getSources()[
                context.project.getSources().indexOf(context.source)
            ];
        const position =
            newNode ??
            (newSource ? newProject.getCaretPosition(newSource) : undefined);
        // Set the caret before revising, as the drop handler does: the source-change effect then
        // re-homes this position onto the new source, where the node it names actually lives.
        if (position !== undefined) editor?.setCaretPosition(position);
        Projects.reviseProject(newProject);
    }
</script>

{#snippet nameLabel()}
    <span class="name"
        ><LocalizedText
            path={(l) =>
                (annotation.conflict as ConflictLocaleAccessor)(l).name}
        /></span
    >
    <!-- The severity in words, so it doesn't ride on the bar's color alone. -->
    <span class="severity"
        ><LocalizedText
            path={(l) =>
                annotation.kind === 'minor'
                    ? l.ui.annotations.severity.minor
                    : l.ui.annotations.severity.major}
        /></span
    >
{/snippet}

{#snippet messageBody()}
    {#each annotation.messages as explain}
        {@const resolutions =
            isStep || !editable ? [] : annotation.resolutions()}
        {@const repairs = resolutions.filter(
            (r): r is Extract<typeof r, { kind: 'repair' }> =>
                r.kind === 'repair',
        )}
        <!-- Explainers that name a dialog: fixes that don't live in the code, so there's
             nothing a repair's synchronous mediator could do. Plain explainers aren't shown,
             since the fallback one restates the message already rendered above. -->
        {@const elsewhere = resolutions.filter(
            (
                r,
            ): r is Extract<typeof r, { kind: 'explain' }> & {
                openDialog: string;
            } => r.kind === 'explain' && r.openDialog !== undefined,
        )}
        <aside aria-label={explain($locales).toText()}>
            <MarkupHTMLView markup={{ perLocale: explain }} />
            {#each elsewhere as resolution}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <!-- Stop propagation so opening the dialog doesn't also toggle the row. -->
                <div
                    class="resolution elsewhere"
                    onclick={(event) => event.stopPropagation()}
                    onkeydown={(event) => event.stopPropagation()}
                >
                    <Button
                        background
                        tip={(l) => l.ui.annotations.button.elsewhere}
                        action={() =>
                            setDialogInURL(resolution.openDialog, true)}
                        >{resolution.openDialogIcon ??
                            DOCUMENTATION_SYMBOL}</Button
                    >
                    <div class="description"
                        ><MarkupHTMLView
                            inline
                            markup={{
                                perLocale: (l) =>
                                    resolution.description(
                                        l,
                                        annotation.context,
                                    ),
                            }}
                        /></div
                    >
                </div>
            {/each}
            {#each repairs as resolution}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <!-- Stop propagation so applying a fix doesn't also toggle the row. -->
                <div
                    class="resolution repair"
                    onclick={(event) => event.stopPropagation()}
                    onkeydown={(event) => event.stopPropagation()}
                >
                    <Button
                        background
                        tip={(l) => l.ui.annotations.button.resolution}
                        action={() =>
                            resolveAnnotation(resolution, annotation.context)}
                        >{CONFIRM_SYMBOL}</Button
                    >
                    <div class="description"
                        ><MarkupHTMLView
                            inline
                            markup={{
                                perLocale: (l) =>
                                    resolution.description(
                                        l,
                                        annotation.context,
                                    ),
                            }}
                        /></div
                    >
                </div>
            {/each}
        </aside>
    {/each}
{/snippet}

{#if isStep}
    <!-- Evaluation step: always expanded, not interactive. -->
    <div
        class={`annotation ${annotation.kind}`}
        transition:fade|local={{ duration: $animationDuration }}
    >
        <Speech character={annotation.node.getCharacter($locales)} below eyes>
            {#snippet content()}{@render messageBody()}{/snippet}
        </Speech>
    </div>
{:else}
    <div
        bind:this={root}
        class={`annotation conflict ${annotation.kind}`}
        class:wiggle={wiggling}
        role="button"
        tabindex="0"
        aria-expanded={expanded}
        aria-label={$locales
            .concretize((l) => l.ui.annotations.conflictLabel, {
                severity: severityWord,
                conflict: $locales.getPrimaryPlainText(
                    (l) =>
                        (annotation.conflict as ConflictLocaleAccessor)(l).name,
                ),
            })
            .toText()}
        data-conflict-node-id={annotation.node.id}
        transition:fade|local={{ duration: $animationDuration }}
        onclick={handleClick}
        onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle();
            }
        }}
        onpointerenter={emphasize}
        onpointerleave={deemphasize}
        onfocusin={emphasize}
        onfocusout={deemphasize}
    >
        <!-- Same Speech in both modes (identical character + name); the bubble
             only appears (and animates in) when expanded. -->
        <Speech
            character={annotation.node.getCharacter($locales)}
            below
            eyes
            bubble={expanded}
        >
            {#snippet aside()}{@render nameLabel()}{/snippet}
            {#snippet content()}{@render messageBody()}{/snippet}
        </Speech>
    </div>
{/if}

<style>
    .annotation {
        padding-inline-start: var(--wordplay-spacing);
        border-inline-start: var(--wordplay-focus-width) solid
            var(--wordplay-error);
    }

    .annotation.conflict {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        width: 100%;
        /* Round the outer (right, in LTR) corners so the hover/focus fill flows
           with the content rather than ending in hard square corners. */
        border-start-end-radius: var(--wordplay-border-radius);
        border-end-end-radius: var(--wordplay-border-radius);
    }

    .annotation.conflict:hover {
        background: var(--wordplay-hover-light);
        /* The fill is transparent yellow over the app background, so keep nested
           links at the foreground color (white would be illegible here) (#1216). */
        --wordplay-link-color: var(--wordplay-foreground);
    }

    .annotation.wiggle {
        animation: shake calc(var(--animation-factor) * 500ms) linear infinite;
    }

    .annotation.step {
        border-color: var(--wordplay-evaluation-color);
    }

    .annotation.major {
        border-color: var(--wordplay-error);
    }

    .annotation.minor {
        border-color: var(--wordplay-warning);
        /* Dotted, per the line vocabulary in app.html: warning gold and
           selection gold are the same hue, so line style carries severity. */
        border-inline-start-style: dotted;
    }

    .severity {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
    }

    aside {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .resolution {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    .description {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-spacing);
        /* Wrap long resolution text — literal-union descriptions can otherwise
           overflow the sidebar's hidden-x edge and get clipped. */
        word-wrap: break-word;
        overflow-wrap: anywhere;
        min-width: 0;
    }
</style>

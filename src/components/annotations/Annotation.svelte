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
    import { CONFIRM_SYMBOL } from '@parser/Symbols';
    import { fade } from 'svelte/transition';
    import { get } from 'svelte/store';
    import { Projects, animationDuration, locales } from '@db/Database';
    import { default as MarkupHTMLView } from '@components/concepts/MarkupHTMLView.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import type { AnnotationInfo } from '@components/annotations/Annotations.svelte';

    interface Props {
        annotation: AnnotationInfo;
        /** Whether this conflict is expanded (only meaningful for conflicts, not steps) */
        expanded: boolean;
        /** Toggle this conflict's expanded state */
        onToggle: () => void;
        /** The tile ID this corresponds to */
        sourceID: string;
    }

    let { annotation, expanded, onToggle, sourceID }: Props = $props();

    // Get the editor this corresponds to.
    const editors = getEditors();
    let editor = $derived($editors?.get(sourceID));

    const emphasizedConflict = getEmphasizedConflict();

    /** True for the evaluation-step annotation, which is always shown expanded and isn't interactive. */
    let isStep = $derived(annotation.conflict === undefined);

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
        // When expanding, reveal the node by moving the caret to it (without
        // stealing keyboard focus from this conflict).
        if (!expanded && editor) editor.setCaretPosition(annotation.node);
        onToggle();
    }

    /** Apply a repair: run the mediator, swap the project. */
    function resolveAnnotation(
        resolution: Extract<Resolution, { kind: 'repair' }>,
        context: Context,
    ) {
        const { newProject } = resolution.mediator(context, $locales);
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
{/snippet}

{#snippet messageBody()}
    {#each annotation.messages as explain}
        {@const repairs = isStep
            ? []
            : annotation
                  .resolutions()
                  .filter(
                      (r): r is Extract<typeof r, { kind: 'repair' }> =>
                          r.kind === 'repair',
                  )}
        <aside aria-label={explain($locales).toText()}>
            <MarkupHTMLView markup={{ perLocale: explain }} />
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
                            resolveAnnotation(
                                resolution,
                                annotation.context,
                            )}>{CONFIRM_SYMBOL}</Button
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
        <Speech character={annotation.node.getCharacter($locales)} below>
            {#snippet content()}{@render messageBody()}{/snippet}
        </Speech>
    </div>
{:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        bind:this={root}
        class={`annotation conflict ${annotation.kind}`}
        class:wiggle={wiggling}
        role="button"
        tabindex="0"
        aria-expanded={expanded}
        aria-label={$locales.getPlainText(
            (l) => (annotation.conflict as ConflictLocaleAccessor)(l).name,
        )}
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
    }

    /* Focus recolors the inline-start border (the conflict's existing left bar)
       and suppresses the global `*:focus` outline, so the bar is the single,
       less-busy focus indicator — on both click and keyboard focus. */
    .annotation.conflict:focus {
        outline: none;
        border-inline-start-color: var(--wordplay-focus-color);
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

<!-- The bottom-row controls for a project: revert, name, tile toggles,
     keyboard help, layout, fullscreen, sharing, translation, and version
     history. Encapsulates the responsive wrap behavior of the toggle group
     (full inline → icons inline → full stacked → icons stacked) so
     ProjectView doesn't need to carry the measurement logic. -->
<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import Emoji from '@components/app/Emoji.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import {
        EnterFullscreen,
        ExitFullscreen,
        ShowKeyboardHelp,
    } from '@components/editor/commands/Commands';
    import Checkpoints from '@components/project/Checkpoints.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import CurrentLayout from '@components/project/CurrentLayout.svelte';
    import FullscreenIcon from '@components/project/FullscreenIcon.svelte';
    import Layout from '@components/project/Layout';
    import NonSourceTileToggle from '@components/project/NonSourceTileToggle.svelte';
    import Separator from '@components/project/Separator.svelte';
    import Sharing from '@components/project/Sharing.svelte';
    import Shortcuts from '@components/project/Shortcuts.svelte';
    import SourceTileToggle from '@components/project/SourceTileToggle.svelte';
    import type Tile from '@components/project/Tile';
    import { TileMode } from '@components/project/Tile';
    import { TileKind } from '@components/project/TileKind';
    import Translate from '@components/project/Translate.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { locales, Projects } from '@db/Database';
    import { isFlagged } from '@db/projects/Moderation';
    import type Project from '@db/projects/Project';
    import { type ArrangementType } from '@db/settings/Arrangement';
    import type Locale from '@locale/Locale';
    import type Source from '@nodes/Source';
    import { INFO_SYMBOL, PROJECT_SYMBOL } from '@parser/Symbols';
    import Characters from '../../lore/BasisCharacters';

    interface Props {
        project: Project;
        layout: Layout;
        editable: boolean;
        shareable: boolean;
        creator: Creator | null;
        chat: Chat | undefined | null | false;
        isCommenter: boolean;
        /** The pre-revert project, if any. Drives the revert button's visibility. */
        original: Project | undefined;
        arrangement: ArrangementType;
        canvasWidth: number;
        canvasHeight: number;
        sources: Source[];
        editorLocales: Record<string, Locale | null>;
        browserFullscreen: boolean;
        setBrowserFullscreen: (state: boolean) => void;
        revert: () => void;
        addSource: () => void;
        toggleTile: (tile: Tile) => void;
        launchTour: () => void;
        checkpoint: number;
    }

    let {
        project,
        layout,
        editable,
        shareable,
        creator,
        chat,
        isCommenter,
        original,
        arrangement,
        canvasWidth,
        canvasHeight,
        sources,
        editorLocales,
        browserFullscreen,
        setBrowserFullscreen,
        revert,
        addSource,
        toggleTile,
        launchTour,
        checkpoint = $bindable(),
    }: Props = $props();

    const user = getUser();

    // Refs and state for the responsive wrap of the toggle group. Four
    // states: full inline, icons inline, full stacked, icons stacked.
    let mainRowEl = $state<HTMLElement | null>(null);
    let leftSectionEl = $state<HTMLElement | null>(null);
    let toggleGroupEl = $state<HTMLElement | null>(null);
    let rightSectionEl = $state<HTMLElement | null>(null);
    let togglesCompact = $state(false);
    let togglesStacked = $state(false);

    /** Refs for hiding the Separator when Checkpoints wraps to its own row. */
    let secondRowEl = $state<HTMLElement | null>(null);
    let checkpointsEl = $state<HTMLElement | null>(null);
    let checkpointsWrapped = $state(false);

    /** Cached natural widths captured while the row is in its full
     * (labels-visible, inline) state. Reused to decide transitions back
     * out of compact/stacked without re-measuring children whose own
     * widths have changed because of those transitions (e.g. labels
     * `display: none` reports offsetWidth = 0). */
    let cachedSizes: {
        left: number;
        togglesFull: number;
        labels: number;
        right: number;
        toggleGap: number;
    } | null = null;

    $effect(() => {
        if (
            mainRowEl === null ||
            leftSectionEl === null ||
            toggleGroupEl === null ||
            rightSectionEl === null
        )
            return;
        const eRow = mainRowEl;
        const eLeft = leftSectionEl;
        const eToggles = toggleGroupEl;
        const eRight = rightSectionEl;

        const measure = () => {
            const rowStyle = getComputedStyle(eRow);
            const toggleStyle = getComputedStyle(eToggles);
            const gap =
                parseFloat(
                    rowStyle.columnGap === 'normal'
                        ? rowStyle.gap
                        : rowStyle.columnGap,
                ) || 0;
            const tGap =
                parseFloat(
                    toggleStyle.columnGap === 'normal'
                        ? toggleStyle.gap
                        : toggleStyle.columnGap,
                ) || 0;
            const padL = parseFloat(rowStyle.paddingLeft) || 0;
            const padR = parseFloat(rowStyle.paddingRight) || 0;
            const available = eRow.clientWidth - padL - padR;

            // Only refresh the cache while we're in the full state, where
            // each toggle's offsetWidth and each label's offsetWidth match
            // their natural values. In compact/stacked the labels are
            // hidden (or the row is wrapped), and reading those values
            // would bake the collapsed widths back into the cache, causing
            // the decision to oscillate.
            if (!togglesCompact && !togglesStacked) {
                let togglesFull = 0;
                let labels = 0;
                const children = Array.from(eToggles.children) as HTMLElement[];
                for (const c of children) {
                    togglesFull += c.offsetWidth;
                    for (const l of c.querySelectorAll<HTMLElement>(
                        '.toggle-label',
                    ))
                        labels += l.offsetWidth;
                }
                if (children.length > 1)
                    togglesFull += tGap * (children.length - 1);
                cachedSizes = {
                    left: eLeft.offsetWidth,
                    togglesFull,
                    labels,
                    right: eRight.offsetWidth,
                    toggleGap: tGap,
                };
            }

            if (cachedSizes === null) return;

            const inlineFull =
                cachedSizes.left +
                cachedSizes.togglesFull +
                cachedSizes.right +
                gap * 2;
            const inlineCompact =
                cachedSizes.left +
                (cachedSizes.togglesFull - cachedSizes.labels) +
                cachedSizes.right +
                gap * 2;

            if (inlineFull <= available) {
                togglesCompact = false;
                togglesStacked = false;
            } else if (inlineCompact <= available) {
                togglesCompact = true;
                togglesStacked = false;
            } else if (cachedSizes.togglesFull <= available) {
                // Doesn't fit alongside left/right, but does fit on its
                // own row with labels.
                togglesCompact = false;
                togglesStacked = true;
            } else {
                // Window is narrow enough that even on its own row the
                // labelled toggles overflow — drop labels and wrap.
                togglesCompact = true;
                togglesStacked = true;
            }
        };

        const observer = new ResizeObserver(measure);
        // Observe only the row, not the children. Children's sizes change
        // as a side effect of our state transitions, so observing them
        // would re-fire measure for our own changes and risk oscillation.
        observer.observe(eRow);
        measure();

        return () => observer.disconnect();
    });

    /** When the toggle group's children, content, or locale change,
     * invalidate the cache so the next measurement re-reads natural
     * widths from a fresh full-state render. */
    $effect(() => {
        sources;
        $locales;
        layout;
        cachedSizes = null;
        togglesCompact = false;
        togglesStacked = false;
    });

    /** Detect whether Checkpoints has wrapped to its own visual row in the
     * second footer row. When it has, the Separator before it serves no
     * purpose (there's nothing on the same row to separate it from), so we
     * hide it. We use `visibility: hidden` (not `display: none`) to keep
     * the separator's width in the layout, so the wrap decision itself
     * doesn't depend on the separator's visibility — that prevents the
     * detection from oscillating in the narrow window where the row width
     * sits between "fits with separator" and "fits without". */
    $effect(() => {
        if (secondRowEl === null || checkpointsEl === null) return;
        const eRow = secondRowEl;
        const eCheck = checkpointsEl;
        const measure = () => {
            const prev = eCheck.previousElementSibling as HTMLElement | null;
            checkpointsWrapped =
                prev !== null && eCheck.offsetTop > prev.offsetTop;
        };
        const observer = new ResizeObserver(measure);
        observer.observe(eRow);
        measure();
        return () => observer.disconnect();
    });
</script>

<nav class="footer" data-uiid="projectControls">
    <div
        class="footer-row main-row"
        class:compact-toggles={togglesCompact}
        class:stacked-toggles={togglesStacked}
        bind:this={mainRowEl}
    >
        <div class="left-section" bind:this={leftSectionEl}>
            {#if original}<Button
                    uiid="revertProject"
                    tip={(l) => l.ui.project.button.revert}
                    active={!project.equals(original)}
                    action={() => revert()}
                    icon="↺"
                ></Button>{/if}
            <Subheader compact>
                <Emoji>{PROJECT_SYMBOL}</Emoji>
                <span class="project-label"
                    ><LocalizedText path={(l) => l.ui.project.label} /></span
                >
                <span data-uiid="projectName">
                    {#if editable}
                        <TextField
                            id="project-name"
                            text={project.getName()}
                            description={(l) =>
                                l.ui.project.field.name.description}
                            placeholder={(l) =>
                                l.ui.project.field.name.placeholder}
                            changed={(name) =>
                                Projects.reviseProject(project.withName(name))}
                            max="7em"
                        />
                    {:else}{project.getName()}{/if}
                </span>
            </Subheader>
            <Button
                tip={(l) => l.ui.project.tour.launch}
                background="circular"
                icon={INFO_SYMBOL}
                uiid="projectTourLaunch"
                action={launchTour}
            ></Button>
        </div>
        <div class="toggle-group" bind:this={toggleGroupEl}>
            {#if editable}
                <Button
                    uiid="addSource"
                    background
                    tip={(l) => l.ui.project.button.addSource}
                    action={addSource}
                    icon="+{Characters.Program.symbols}"
                ></Button>{/if}
            {#each sources as source, index (index)}
                {@const tile = layout.getTileWithID(Layout.getSourceID(index))}
                {#if tile}
                    {#if index === 0}
                        <span data-uiid="sourceToggle">
                            <SourceTileToggle
                                {project}
                                {source}
                                expanded={tile.mode === TileMode.Expanded &&
                                    !tile.isInvisible()}
                                toggle={() => toggleTile(tile)}
                            />
                        </span>
                    {:else}
                        <SourceTileToggle
                            {project}
                            {source}
                            expanded={tile.mode === TileMode.Expanded &&
                                !tile.isInvisible()}
                            toggle={() => toggleTile(tile)}
                        />
                    {/if}
                {/if}
            {/each}
            {#each layout.getNonSources() as tile (tile.id)}
                {#if tile.isVisibleCollapsed(editable || (tile.kind === TileKind.Collaborate && isCommenter))}
                    <NonSourceTileToggle
                        {project}
                        {tile}
                        toggle={() => toggleTile(tile)}
                        notification={tile.kind === TileKind.Collaborate &&
                            !!chat &&
                            isAuthenticated($user) &&
                            chat.hasUnread($user.uid)}
                    />
                {/if}
            {/each}
        </div>
        <div class="right-section" bind:this={rightSectionEl}>
            <CurrentLayout {arrangement} {canvasWidth} {canvasHeight} />
            <span data-uiid="shortcutsDialog"
                ><Dialog
                    header={(l) => l.ui.dialog.help.header}
                    explanation={(l) => l.ui.dialog.help.explanation}
                    button={{
                        tip: ShowKeyboardHelp.description,
                        icon: ShowKeyboardHelp.symbol,
                    }}><Shortcuts /></Dialog
                ></span
            >
            <Toggle
                tips={(l) => l.ui.project.toggle.fullscreen}
                on={browserFullscreen}
                command={browserFullscreen ? ExitFullscreen : EnterFullscreen}
                toggle={() => setBrowserFullscreen(!browserFullscreen)}
            >
                <FullscreenIcon />
            </Toggle>
        </div>
    </div>
    {#if editable}
        <div
            class="footer-row"
            class:checkpoints-wrapped={checkpointsWrapped}
            bind:this={secondRowEl}
        >
            {#if creator}
                <CreatorView {creator} />
            {/if}
            {#if shareable}
                <span data-uiid="shareDialog">
                    <Dialog
                        header={(l) => l.ui.dialog.share.header}
                        explanation={(l) => l.ui.dialog.share.explanation}
                        button={{
                            tip: (l) => l.ui.project.button.share.tip,
                            icon:
                                project.isPublic() &&
                                isFlagged(project.getFlags())
                                    ? '‼️'
                                    : '↗',
                            label: (l) => l.ui.project.button.share.label,
                            background: true,
                        }}
                    >
                        <Sharing {project} />
                    </Dialog>
                </span>
            {/if}
            <span data-uiid="translateButton">
                <Translate
                    {project}
                    showAll={() => {
                        for (const id of Object.keys(editorLocales))
                            editorLocales[id] = null;
                    }}
                ></Translate>
            </span>
            <Separator />
            <span data-uiid="checkpoints" bind:this={checkpointsEl}>
                <Checkpoints {project} bind:checkpoint></Checkpoints>
            </span>
        </div>
    {/if}
</nav>

<style>
    .footer {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: flex-start;
        width: 100%;
        padding: var(--wordplay-spacing);
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        box-sizing: border-box;
        /* Don't let the footer be flex-shrunk by an ancestor — its content
           must be fully visible, even when it grows to multiple lines. */
        flex-shrink: 0;
    }

    .footer-row {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        align-items: center;
        /* Fit row height to its content rather than letting wrapped lines
           or the parent flex column inflate it. */
        height: fit-content;
        align-content: flex-start;
        line-height: 1;
    }

    /* The main row is a grid with three named areas so the toggle group
       can drop to its own row when it doesn't fit alongside the left and
       right sections. Same pattern as TileView's stacked toolbar. */
    .footer-row.main-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-areas: 'left toggles right';
        align-items: center;
        height: fit-content;
    }

    .footer-row.main-row.stacked-toggles {
        grid-template-areas:
            'left . right'
            'toggles toggles toggles';
    }

    .left-section {
        grid-area: left;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        min-width: 0;
    }

    .toggle-group {
        grid-area: toggles;
        display: flex;
        flex-direction: row;
        align-items: center;
        align-content: flex-start;
        gap: var(--wordplay-spacing);
        min-width: 0;
        flex-wrap: wrap;
        height: fit-content;
    }

    .right-section {
        grid-area: right;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    /* Compact mode: hide the labels inside each toggle, keep the icons. */
    .footer-row.main-row.compact-toggles :global(.toggle-label) {
        display: none;
    }

    /* When Checkpoints wraps to its own row, hide the leading Separator.
       Use visibility (not display) so the separator's width stays in the
       layout — otherwise toggling it would change wrap and oscillate. */
    .footer-row.checkpoints-wrapped :global(.separator) {
        visibility: hidden;
    }

    .project-label {
        margin-inline-end: var(--wordplay-spacing-half);
    }
</style>

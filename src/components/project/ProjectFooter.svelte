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
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { locales, Projects } from '@db/Database';
    import { MAX_NAME_LENGTH } from '@db/limits';
    import {
        getLocalizedProjectName,
        validateProjectName,
    } from '@db/projects/getLocalizedProjectName';
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

    // Layout responsiveness:
    //  - Below the container query threshold (see CSS), the "project"
    //    header label and emoji hide to give the name field more room.
    //  - The toggle-group (add-source + per-tile toggles) is wrapped in
    //    OverflowToolbar so individual toggles drop into a hamburger
    //    popup as the row narrows, instead of overlapping the right
    //    section.
    //  - When the footer is narrow enough that we're already hiding
    //    toggle labels (see CSS @container threshold), the second-row
    //    controls (creator, share, translate, checkpoints) collapse into
    //    the *same* toggle-group popup rather than getting their own — so
    //    small-phone layouts get a single popup, not two.

    const visibleNonSources = $derived(
        layout
            .getNonSources()
            .filter((tile) =>
                tile.isVisibleCollapsed(
                    editable ||
                        (tile.kind === TileKind.Collaborate && isCommenter),
                ),
            ),
    );

    // Indices in the toggle-group items list:
    //   0..addSourceOffset-1     : add-source button (when editable)
    //   addSourceOffset..sourcesEnd-1 : SourceTileToggle per source
    //   sourcesEnd..nonSourcesEnd-1   : NonSourceTileToggle per visible
    //   nonSourcesEnd..nonSourcesEnd+3 (when narrow & editable):
    //                                second-row items appended for
    //                                single-popup mode
    const addSourceOffset = $derived(editable ? 1 : 0);
    const sourcesEnd = $derived(addSourceOffset + sources.length);
    const nonSourcesEnd = $derived(sourcesEnd + visibleNonSources.length);

    // Match the CSS @container threshold below for toggle-label hiding.
    const NARROW_THRESHOLD_PX = 900;
    let footerEl = $state<HTMLElement | null>(null);
    let narrow = $state(false);

    $effect(() => {
        if (footerEl === null) return;
        const eFooter = footerEl;
        const measure = () => {
            narrow = eFooter.clientWidth < NARROW_THRESHOLD_PX;
        };
        const observer = new ResizeObserver(measure);
        observer.observe(eFooter);
        measure();
        return () => observer.disconnect();
    });

    const showSecondRow = $derived(editable && !narrow);
    const appendSecondRow = $derived(editable && narrow);
    const toggleItemCount = $derived(
        nonSourcesEnd + (appendSecondRow ? 4 : 0),
    );
</script>

{#snippet creatorItem()}
    {#if creator}<CreatorView {creator} />{/if}
{/snippet}

{#snippet shareItem()}
    {#if shareable}
        <span data-uiid="shareDialog">
            <Dialog
                header={(l) => l.ui.dialog.share.header}
                explanation={(l) => l.ui.dialog.share.explanation}
                button={{
                    tip: (l) => l.ui.project.button.share.tip,
                    icon:
                        project.isPublic() && isFlagged(project.getFlags())
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
{/snippet}

{#snippet translateItem()}
    <span data-uiid="translateButton">
        <Translate
            {project}
            showAll={() => {
                for (const id of Object.keys(editorLocales))
                    editorLocales[id] = null;
            }}
        ></Translate>
    </span>
{/snippet}

{#snippet checkpointsItem()}
    <span data-uiid="checkpoints">
        <Checkpoints {project} bind:checkpoint></Checkpoints>
    </span>
{/snippet}

<nav class="footer" data-uiid="projectControls" bind:this={footerEl}>
    <div class="footer-row main-row">
        <div class="left-section">
            {#if original}<Button
                    uiid="revertProject"
                    tip={(l) => l.ui.project.button.revert}
                    active={!project.equals(original)}
                    action={() => revert()}
                    icon="↺"
                ></Button>{/if}
            <Subheader compact>
                <span class="project-meta">
                    <Emoji>{PROJECT_SYMBOL}</Emoji>
                    <span class="project-label"
                        ><LocalizedText
                            path={(l) => l.ui.project.label}
                        /></span
                    >
                </span>
                <span data-uiid="projectName">
                    {#if editable}
                        <!-- The TextField shows the RAW underlying name
                             (which may be Wordplay TextLiteral source for a
                             multilingual project, e.g. `"hi"/en"hola"/es`)
                             so the user edits the source directly. The
                             validator surfaces inline feedback for
                             malformed input, but it doesn't gate the save
                             — mid-typing states are necessarily invalid
                             and the user shouldn't lose keystrokes (#456). -->
                        <TextField
                            id="project-name"
                            text={project.getName()}
                            description={(l) =>
                                l.ui.project.field.name.description}
                            placeholder={(l) =>
                                l.ui.project.field.name.placeholder}
                            validator={validateProjectName}
                            changed={(name) =>
                                Projects.reviseProject(project.withName(name))}
                            max="5em"
                            maxlength={MAX_NAME_LENGTH}
                        />
                    {:else}{getLocalizedProjectName(project, $locales)}{/if}
                </span>
            </Subheader>
            <Button
                tip={(l) => l.ui.project.tour.launch}
                background="circular"
                padding={false}
                icon={INFO_SYMBOL}
                uiid="projectTourLaunch"
                action={launchTour}
            ></Button>
        </div>
        {#snippet renderToggle(i: number)}
            {#if editable && i === 0}
                <Button
                    uiid="addSource"
                    background
                    tip={(l) => l.ui.project.button.addSource}
                    action={addSource}
                    icon="+{Characters.Program.symbols}"
                ></Button>
            {:else if i < sourcesEnd}
                {@const sourceIndex = i - addSourceOffset}
                {@const source = sources[sourceIndex]}
                {@const tile = layout.getTileWithID(
                    Layout.getSourceID(sourceIndex),
                )}
                {#if tile}
                    {#if sourceIndex === 0}
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
            {:else if i < nonSourcesEnd}
                {@const tile = visibleNonSources[i - sourcesEnd]}
                <NonSourceTileToggle
                    {project}
                    {tile}
                    toggle={() => toggleTile(tile)}
                    notification={tile.kind === TileKind.Collaborate &&
                        !!chat &&
                        isAuthenticated($user) &&
                        chat.hasUnread($user.uid)}
                />
            {:else}
                <!-- Narrow mode: second-row items are appended to the
                     toggle-group's items so everything overflows into a
                     single popup. -->
                {@const localIdx = i - nonSourcesEnd}
                {#if localIdx === 0}
                    {@render creatorItem()}
                {:else if localIdx === 1}
                    {@render shareItem()}
                {:else if localIdx === 2}
                    {@render translateItem()}
                {:else}
                    {@render checkpointsItem()}
                {/if}
            {/if}
        {/snippet}

        <div class="toggle-group">
            <OverflowToolbar
                items={{ count: toggleItemCount, render: renderToggle }}
            />
        </div>
        <div class="right-section">
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
    {#if showSecondRow}
        <div class="footer-row second-row">
            <OverflowToolbar
                items={[
                    creatorItem,
                    shareItem,
                    translateItem,
                    checkpointsItem,
                ]}
            />
        </div>
    {/if}
</nav>

<style>
    .footer {
        /* Container query context — children hide based on footer width
           rather than viewport size, so the layout responds to changes in
           the surrounding panel (e.g. floating tile arrangements) too. */
        container-type: inline-size;

        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: flex-start;
        width: 100%;
        padding: var(--wordplay-spacing);
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        box-sizing: border-box;
        flex-shrink: 0;
    }

    .footer-row {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: center;
        height: fit-content;
        line-height: 1;
    }

    .footer-row.main-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-areas: 'left toggles right';
        align-items: center;
        height: fit-content;
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
        gap: var(--wordplay-spacing);
        min-width: 0;
        flex-wrap: nowrap;
    }

    .right-section {
        grid-area: right;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        flex-shrink: 0;
    }

    .project-meta {
        display: inline-flex;
        align-items: center;
        gap: var(--wordplay-spacing-half);
    }

    .project-label {
        margin-inline-end: var(--wordplay-spacing-half);
    }

    /* Hide the "project" header label/emoji on narrow footers so the
       editable name field has room and the right-section controls don't
       overlap the name. */
    @container (max-width: 700px) {
        .project-meta {
            display: none;
        }
    }

    /* Below the labels threshold, drop the tile-toggle text labels and
       keep only the icons so the toggle group fits inline alongside the
       left section and right section. */
    @container (max-width: 900px) {
        .toggle-group :global(.toggle-label) {
            display: none;
        }
    }
</style>

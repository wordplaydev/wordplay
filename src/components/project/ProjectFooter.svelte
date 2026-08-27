<!-- The bottom-row controls for a project: revert, name, tile toggles,
     keyboard help, layout, fullscreen, sharing, translation, and version
     history. Encapsulates the responsive wrap behavior of the toggle group
     (full inline → icons inline → full stacked → icons stacked) so
     ProjectView doesn't need to carry the measurement logic. -->
<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import Emoji from '@components/app/Emoji.svelte';
    import Link from '@components/app/Link.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import {
        EnterFullscreen,
        ExitFullscreen,
        ShowKeyboardHelp,
    } from '@components/editor/commands/Commands';
    import Checkpoints from '@components/project/Checkpoints.svelte';
    import type { CheckpointAnchor } from '@components/project/checkpoints';
    import CopyProjectButton from '@components/project/CopyProjectButton.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import CurrentLayout from '@components/project/CurrentLayout.svelte';
    import FullscreenIcon from '@components/project/FullscreenIcon.svelte';
    import Layout from '@components/project/Layout';
    import NonSourceTileToggle from '@components/project/NonSourceTileToggle.svelte';
    import Sharing from '@components/project/Sharing.svelte';
    import Shortcuts from '@components/project/Shortcuts.svelte';
    import SourceTileToggle from '@components/project/SourceTileToggle.svelte';
    import {
        ProjectModeIcons,
        ProjectModes,
        ProjectModeViewIcons,
        type ProjectMode,
    } from '@components/project/ProjectMode';
    import type Tile from '@components/project/Tile';
    import { TileMode } from '@components/project/Tile';
    import { TileKind } from '@components/project/TileKind';
    import Languages from '@components/project/Languages.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { locales } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import { MAX_NAME_LENGTH } from '@db/limits';
    import {
        getLocalizedProjectName,
        getProjectNameCount,
        validateProjectName,
    } from '@db/projects/getLocalizedProjectName';
    import { isFlagged } from '@db/projects/Moderation';
    import type Project from '@db/projects/Project';
    import Arrangement, {
        type ArrangementType,
    } from '@db/settings/Arrangement';
    import type Locale from '@locale/Locale';
    import type Source from '@nodes/Source';
    import {
        EDIT_SYMBOL,
        INFO_SYMBOL,
        PROJECT_SYMBOL,
        REMIX_SYMBOL,
    } from '@parser/Symbols';
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
        checkpoint: CheckpointAnchor;
        /** The project's evaluation mode, mirrored here so it's reachable when
         * the output tile (and its switcher) is collapsed. */
        mode: ProjectMode;
        setMode: (mode: ProjectMode) => void;
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
        mode,
        setMode,
    }: Props = $props();

    const user = getUser();

    // When a project's name is a multilingual literal (more than one
    // language name), show the clean localized name by default and only
    // reveal the raw-literal TextField when the creator toggles edit mode.
    let editingName = $state(false);
    const multipleNames = $derived(getProjectNameCount(project.getName()) > 1);

    // The link back to a remix's source. Deliberately not resolved before
    // rendering — checking that the source still exists would cost a read on
    // every project load, and a dead link just lands on the project page's
    // existing unknown-project notice. The self-reference guard is cheap
    // defense against a hand-crafted document linking to itself.
    const remixOf = $derived(
        project.getRemixOf() === project.getID() ? null : project.getRemixOf(),
    );

    // Layout responsiveness:
    //  - Below the container query threshold (see CSS), the project
    //    emoji hides to give the name field more room.
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

    /** Whether the first evaluation mode is truthfully "edit" right now: an
     *  editable project on its current version. Browsing an old checkpoint is
     *  read-only, so the switcher says 👁 view there, matching the editor. */
    const editableAndCurrent = $derived(editable && checkpoint === null);

    // Indices in `renderToggle`'s items list, which two different toolbars index
    // into (the tile row below, and the toggle group in the main row):
    //   0..addSourceOffset-1     : add-source button (when editable)
    //   addSourceOffset..sourcesEnd-1 : SourceTileToggle per source
    //   sourcesEnd..nonSourcesEnd-1   : NonSourceTileToggle per visible
    //   nonSourcesEnd..nonSourcesEnd+SecondRowItemCount-1 (when narrow &
    //                                editable): second-row items appended
    //                                for single-popup mode
    const addSourceOffset = $derived(editable ? 1 : 0);
    const sourcesEnd = $derived(addSourceOffset + sources.length);
    const nonSourcesEnd = $derived(sourcesEnd + visibleNonSources.length);

    /** How many second-row items `renderToggle`'s tail renders; keep in sync with it. */
    const SecondRowItemCount = 5;

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

    /** The layout actually in effect, which differs from the chosen arrangement when
     *  it's responsive. Derived here the way CurrentLayout does, from the same props. */
    const computedArrangement = $derived(
        Layout.getComputedLayout(arrangement, canvasWidth, canvasHeight),
    );

    /** In one- and two-tile arrangements the tile toggles aren't show/hide controls,
     *  they're how you navigate between tiles — so on a narrow footer, where they'd
     *  otherwise be four taps deep in the shared overflow popup, they get their own
     *  always-visible row. Wider footers already show them inline, one tap away. */
    const tabbed = $derived(
        narrow &&
            (computedArrangement === Arrangement.Single ||
                computedArrangement === Arrangement.Split),
    );

    /** The tile toggles alone, for the tile row. */
    const tileItemCount = $derived(nonSourcesEnd);
    const toggleItemCount = $derived(
        nonSourcesEnd + (appendSecondRow ? SecondRowItemCount : 0),
    );
</script>

{#snippet creatorItem()}
    {#if creator}<CreatorView {creator} />{/if}
{/snippet}

{#snippet shareItem()}
    {#if shareable}
        <span data-uiid="shareDialog">
            <Dialog
                id="share"
                header={(l) => l.ui.dialog.share.header}
                explanation={(l) => l.ui.dialog.share.explanation}
                pinned
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
                {#snippet headerControls()}
                    <CopyProjectButton {project} />
                {/snippet}
                <Sharing {project} {editable} />
            </Dialog>
        </span>
    {/if}
{/snippet}

{#snippet languagesItem()}
    <span data-uiid="languagesButton">
        <Languages
            {project}
            showAll={() => {
                for (const id of Object.keys(editorLocales))
                    editorLocales[id] = null;
            }}
        ></Languages>
    </span>
{/snippet}

{#snippet checkpointsItem()}
    <span data-uiid="checkpoints">
        <Checkpoints {project} bind:checkpoint></Checkpoints>
    </span>
{/snippet}

{#snippet shortcutsItem()}
    <span data-uiid="shortcutsDialog"
        ><Dialog
            id="shortcuts"
            header={(l) => l.ui.dialog.help.header}
            explanation={(l) => l.ui.dialog.help.explanation}
            button={{
                tip: ShowKeyboardHelp.description,
                icon: ShowKeyboardHelp.symbol,
            }}><Shortcuts /></Dialog
        ></span
    >
{/snippet}

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
        {@const tile = layout.getTileWithID(Layout.getSourceID(sourceIndex))}
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
        <!-- Guarded like the source branch above: the toolbar renders
             this snippet at three independent index ranges and decides
             how many fit from a ResizeObserver, so the index and the
             list it indexes aren't guaranteed to be read together. -->
        {#if tile}
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
    {:else}
        <!-- Narrow but not tabbed: the second-row items are appended to the
             toggle group's items so everything overflows into a single popup.
             When the tiles have their own row the toggle group renders these
             five directly instead, so this tail is unreachable. -->
        {@const localIdx = i - nonSourcesEnd}
        {#if localIdx === 0}
            {@render creatorItem()}
        {:else if localIdx === 1}
            {@render shareItem()}
        {:else if localIdx === 2}
            {@render languagesItem()}
        {:else if localIdx === 3}
            {@render checkpointsItem()}
        {:else}
            {@render shortcutsItem()}
        {/if}
    {/if}
{/snippet}

<nav class="footer" data-uiid="projectControls" bind:this={footerEl}>
    {#if tabbed}
        <div class="footer-row tile-row">
            <OverflowToolbar
                items={{ count: tileItemCount, render: renderToggle }}
            />
        </div>
    {/if}
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
                <span class="project-meta"><Emoji text={PROJECT_SYMBOL} /></span
                >
                <!-- A scratch project is a copy of an example to poke at, so
                     there's nothing worth naming; the row below says what it
                     is instead. -->
                <span data-uiid="projectName">
                    {#if project.isScratch()}{:else if editable}
                        {#if multipleNames && !editingName}
                            <!-- Multilingual name, not editing: show the
                                 localized name like the read-only view. -->
                            {getLocalizedProjectName(project, $locales)}
                        {:else}
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
                                    Projects.reviseProject(
                                        project.withName(name),
                                    )}
                                max={narrow ? '6ch' : '10ch'}
                                maxlength={MAX_NAME_LENGTH}
                            />
                        {/if}
                    {:else}{getLocalizedProjectName(project, $locales)}{/if}
                </span>
                {#if editable && multipleNames}
                    <Toggle
                        uiid="editProjectName"
                        tips={(l) => l.ui.project.toggle.editName}
                        on={editingName}
                        toggle={() => (editingName = !editingName)}
                        >{EDIT_SYMBOL}</Toggle
                    >
                {/if}
                {#if remixOf !== null}
                    <Link
                        to={`/project/${encodeURI(remixOf)}`}
                        tip={(l) => l.ui.project.link.remixOf}
                        ><Emoji text={REMIX_SYMBOL} /></Link
                    >
                {/if}
            </Subheader>
            <Button
                tip={(l) => l.ui.project.tour.launch}
                background="circular"
                icon={INFO_SYMBOL}
                uiid="projectTourLaunch"
                action={launchTour}
            ></Button>
        </div>

        <div class="toggle-group">
            {#if tabbed}
                <!-- The tile toggles have their own row, so only the second-row
                     items are left to overflow here. Rendered as an array rather
                     than through renderToggle's tail, which indexes them off the
                     tile counts this branch no longer uses. -->
                {#if appendSecondRow}
                    <OverflowToolbar
                        items={[
                            creatorItem,
                            shareItem,
                            languagesItem,
                            checkpointsItem,
                            shortcutsItem,
                        ]}
                    />
                {/if}
            {:else}
                <OverflowToolbar
                    items={{ count: toggleItemCount, render: renderToggle }}
                />
            {/if}
        </div>
        <div class="right-section">
            <!-- A second home for the evaluation mode switcher, since the output
                 tile's switcher disappears when that tile is collapsed. -->
            <Mode
                modes={editableAndCurrent
                    ? (l) => l.ui.output.mode.evaluation
                    : (l) => l.ui.output.mode.evaluationView}
                icons={editableAndCurrent
                    ? ProjectModeIcons
                    : ProjectModeViewIcons}
                choice={ProjectModes.indexOf(mode)}
                select={(index) => setMode(ProjectModes[index])}
                labeled={false}
                modeLabels={false}
            />
            <CurrentLayout {arrangement} {canvasWidth} {canvasHeight} />
            <!-- The shortcuts dialog lives on the second row when there is one;
                 without one (read-only projects), it stays here. -->
            {#if !showSecondRow && !appendSecondRow}
                {@render shortcutsItem()}
            {/if}
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
                items={[creatorItem, shareItem, languagesItem, checkpointsItem]}
            />
            {@render shortcutsItem()}
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

    /* .footer's border-top sits above the tile row, so without a rule of its own the
       tabs read as chrome belonging to the project row rather than as labels for the
       tile above them. */
    .footer-row.tile-row {
        padding-block-end: var(--wordplay-spacing);
        border-block-end: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    /* The tabs are icons: every tile kind has its own emoji, so a label only earns
       its width when several sources would otherwise share the same one. This also
       matches the toolbar's hidden measurement clones, so measured widths match
       rendered ones; the portaled overflow popup escapes this rule, so anything that
       does overflow keeps its label. */
    .tile-row :global(.toggle-label) {
        display: none;
    }

    .tile-row :global(.toggle-label.named) {
        display: inline;
    }

    .footer-row.main-row {
        display: grid;
        /* `minmax(0, auto)` on the left track, not `auto`: an `auto` track
           can't shrink below its content, so anything wide there takes the
           row and leaves the toggles nothing. */
        grid-template-columns: minmax(0, auto) minmax(0, 1fr) auto;
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
        /* Separates the emoji from the name field beside it; template
           whitespace alone reads as too tight at header size. */
        margin-inline-end: var(--wordplay-spacing-half);
    }

    /* Hide the project emoji on narrow footers so the editable name field
       has room and the right-section controls don't overlap the name. */
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

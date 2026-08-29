<script lang="ts">
    import {
        commitInsertion,
        ensureStage,
        groupProblem,
        groupSelection,
        insertOutput,
        wrappingKinds,
        type InsertKind,
    } from '@components/palette/insertOutput';
    import { addStage, getStage } from '@components/palette/editOutput';
    import MIDIImporter from '@components/palette/MIDIImporter.svelte';
    import {
        getDrawing,
        getSelectedOutput,
        getStageScene,
    } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { DB, locales } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import type Project from '@db/projects/Project';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import type Evaluate from '@nodes/Evaluate';
    import { GROUP_SYMBOL, STAGE_SYMBOL } from '@parser/Symbols';

    interface Props {
        project: Project;
        editable: boolean;
    }

    let { project, editable }: Props = $props();

    const selection = getSelectedOutput();
    const stageScene = getStageScene();
    const drawing = getDrawing();

    /** What's selected right now, resolved against this project. */
    let selected = $derived<Evaluate[]>(selection?.getOutput(project) ?? []);

    /** The glyph a creator would type for each kind, read from the definition
     *  rather than restated here, so a locale that renames one is followed. */
    let glyphs = $derived({
        phrase: $locales.getName(project.shares.output.Phrase.names),
        rectangle: $locales.getName(project.shares.output.Rectangle.names),
        circle: $locales.getName(project.shares.output.Circle.names),
        polygon: $locales.getName(project.shares.output.Polygon.names),
        path: $locales.getName(project.shares.output.Path.names),
        music: $locales.getName(project.shares.output.Music.names),
        say: $locales.getName(project.shares.output.Say.names),
    });

    let stageExists = $derived(getStage(project) !== undefined);

    /** Which buttons show what they already have rather than adding to it. */
    let wrapping = $derived(wrappingKinds(project));
    let groupBlocked = $derived(groupProblem(project, selected));

    /** Add something, then select it, so its properties appear below without
     *  the creator having to find what they just made. The caret moves with it
     *  (see commitInsertion), which is also what keeps the palette's own
     *  caret-driven selection from replacing this one. */
    function insert(kind: InsertKind) {
        const scene = $stageScene?.();
        const insertion = insertOutput(
            project,
            $locales,
            kind,
            selected,
            scene,
        );
        if (insertion === undefined) return;
        const revised = commitInsertion(DB, insertion);
        selection?.setPaths(revised, [insertion.node], 'palette');
    }

    /** Wrapping in a @Stage is the one action that transforms rather than adds,
     *  since only one is legal. Select it after, like everything else here. */
    function stage() {
        const revised = addStage(DB, project);
        if (revised === undefined) return;
        const made = getStage(revised);
        if (made !== undefined) selection?.setPaths(revised, [made], 'palette');
    }

    /** Turn drawing on or off. Arming a program that renders nothing gives it a stage first,
     *  so there is a canvas to draw on and a preview to draw it with — without one the pencil
     *  looked like it did nothing, and finding the missing @Stage was left to the creator. */
    function draw() {
        if (drawing === undefined) return;
        if (!drawing.armed) {
            const revised = ensureStage(project, $locales);
            if (revised !== undefined) Projects.reviseProject(revised);
        }
        drawing.toggle();
    }

    function group() {
        const insertion = groupSelection(project, $locales, selected);
        if (insertion === undefined) return;
        const revised = commitInsertion(DB, insertion);
        selection?.setPaths(revised, [insertion.node], 'palette');
    }

    /** One button per addable kind, in the order they're offered: the things you
     *  see first, then what collects and frames them, then what you hear. */
    let adds = $derived<
        { kind: InsertKind; glyph: string; tip: LocaleTextAccessor }[]
    >([
        {
            kind: 'phrase',
            glyph: glyphs.phrase,
            tip: wrapping.has('phrase')
                ? (l) => l.ui.palette.toolbar.wrapPhrase
                : (l) => l.ui.palette.toolbar.addPhrase,
        },
        {
            kind: 'rectangle',
            glyph: glyphs.rectangle,
            tip: wrapping.has('rectangle')
                ? (l) => l.ui.palette.toolbar.wrapForm
                : (l) => l.ui.palette.toolbar.addRectangle,
        },
        {
            kind: 'circle',
            glyph: glyphs.circle,
            tip: wrapping.has('circle')
                ? (l) => l.ui.palette.toolbar.wrapForm
                : (l) => l.ui.palette.toolbar.addCircle,
        },
        {
            kind: 'polygon',
            glyph: glyphs.polygon,
            tip: wrapping.has('polygon')
                ? (l) => l.ui.palette.toolbar.wrapForm
                : (l) => l.ui.palette.toolbar.addPolygon,
        },
        {
            kind: 'path',
            glyph: glyphs.path,
            tip: wrapping.has('path')
                ? (l) => l.ui.palette.toolbar.wrapForm
                : (l) => l.ui.palette.toolbar.addPath,
        },
    ]);

    /** What is heard rather than seen, after the things that are seen. */
    let sounds = $derived<
        { kind: InsertKind; glyph: string; tip: LocaleTextAccessor }[]
    >([
        {
            kind: 'music',
            glyph: glyphs.music,
            tip: (l) => l.ui.palette.toolbar.addMusic,
        },
        {
            kind: 'say',
            glyph: glyphs.say,
            tip: (l) => l.ui.palette.toolbar.addSay,
        },
    ]);

    /** Item layout, each index one overflow unit:
     *      0…4   the five things you can see
     *      5     collect the selection into a Group
     *      6     wrap everything in a Stage
     *      7     add Music
     *      8     import a song as Music — beside adding one, since it is the
     *            other way to get Music rather than a lesser one
     *      9     add a Say
     */
    /** The drawing toggle's glyph: the same one the Path form is named with, since arming
     *  the mode is how a creator draws one. */
    const DRAW_GLYPH = '\u270e';

    const GroupItem = 5;
    const StageItem = 6;
    const MusicItem = 7;
    const ImportItem = 8;
    let itemCount = $derived(adds.length + 5);
</script>

{#snippet renderItem(i: number)}
    {#if i < adds.length}
        {@const add = adds[i]}
        <Button
            tip={add.tip}
            active={editable}
            action={() => insert(add.kind)}
            icon={add.glyph}
        ></Button>
    {:else if i === GroupItem}
        <!-- Grouping acts on the selection rather than adding, so unlike every
             other button it is legitimately inactive: with nothing selected
             there is nothing to collect. Its tip says which reason applies. -->
        <Button
            tip={groupBlocked === 'empty'
                ? (l) => l.ui.palette.toolbar.groupEmpty
                : groupBlocked === 'scattered'
                  ? (l) => l.ui.palette.toolbar.groupScattered
                  : groupBlocked === 'kind'
                    ? (l) => l.ui.palette.toolbar.groupKind
                    : (l) => l.ui.palette.toolbar.group}
            active={editable && groupBlocked === undefined}
            action={group}
            icon={GROUP_SYMBOL}
        ></Button>
    {:else if i === StageItem}
        <!-- Only one Stage is legal, so this is the other button that can be
             inactive. -->
        <Button
            tip={stageExists
                ? (l) => l.ui.palette.toolbar.stageExists
                : (l) => l.ui.palette.toolbar.addStage}
            active={editable && !stageExists}
            action={stage}
            icon={STAGE_SYMBOL}
        ></Button>
    {:else if i === MusicItem}
        <Button
            tip={sounds[0].tip}
            active={editable}
            action={() => insert(sounds[0].kind)}
            icon={sounds[0].glyph}
        ></Button>
    {:else if i === ImportItem}
        <MIDIImporter {project} {editable} />
    {:else}
        <Button
            tip={sounds[1].tip}
            active={editable}
            action={() => insert(sounds[1].kind)}
            icon={sounds[1].glyph}
        ></Button>
    {/if}
{/snippet}

<div
    class="insert"
    data-uiid="paletteInsertToolbar"
    role="toolbar"
    aria-label={$locales.getPrimaryPlainText((l) => l.ui.palette.toolbar.label)}
>
    <!-- One + for the whole row rather than one per button: with a + on each,
         nine buttons were wide enough that most layouts pushed half of them
         into the overflow menu, which is the opposite of a toolbar. A plain +,
         the same one every other add button in the app uses.

         A sibling of the toolbar rather than its `pinnedStart`, which anchors
         itself to the inline start and pushes everything else to the inline end
         with an auto margin — a wide gap between the + and the buttons it is
         meant to be labelling. -->
    <span class="plus" aria-hidden="true">+</span>
    <div class="row">
        <OverflowToolbar items={{ count: itemCount, render: renderItem }} />
    </div>
    <!-- Drawing is a mode, not an insertion: it changes what a press on the
         stage does until it's turned off, where every button above adds one
         thing and is done. So it sits outside the row the + labels, on the far
         side, rather than reading as one more thing the + adds. -->
    {#if editable}
        <!-- One button rather than a Switch's pair: the row is already at the width where
             adding two pushes things into the overflow menu, and a mode is on or off rather
             than a choice between two named states. -->
        <Toggle
            tips={(l) => l.ui.palette.toolbar.draw}
            on={drawing?.armed ?? false}
            toggle={draw}
            uiid="drawToggle">{DRAW_GLYPH}</Toggle
        >
    {/if}
</div>

<style>
    /* Pinned to the top of the palette tile, and present whether or not
       something is selected: adding used to require deselecting first, which is
       what made composing a layout out of several phrases so awkward. The
       scroller is the tile's own .content, not .palette, so top: 0 pins to the
       tile's edge — and the negative margins undo .palette's padding so
       content scrolls past the row's sides rather than beside them. */
    /* The one + that stands for every button in the row. */
    .plus {
        font-size: var(--wordplay-font-size);
        opacity: 0.7;
        flex: 0 0 auto;
    }

    /* The toolbar takes the rest, so it measures the width it actually has. */
    .row {
        flex: 1 1 auto;
        min-width: 0;
    }

    .insert {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        position: sticky;
        top: 0;
        z-index: 1;
        background-color: var(--wordplay-background);
        margin: calc(-2 * var(--wordplay-spacing));
        margin-bottom: 0;
        padding: var(--wordplay-spacing) calc(2 * var(--wordplay-spacing));
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }
</style>

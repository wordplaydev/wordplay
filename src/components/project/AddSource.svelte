<script lang="ts">
    /**
     * The one place in the app that makes a new source file (#559, #560).
     *
     * A project can hold more than one file of code, and until now there were three
     * unrelated ways to get one: a `+` in the footer for an empty file, a MIDI
     * importer tucked into the palette's insert toolbar, and nothing at all for a
     * picture. They are the same act — data becoming code — so they are one dialog,
     * and a creator looking for "how do I get this into my project" has one place
     * to look rather than three to know about.
     *
     * Everything here happens on the device. A picture is decoded, sampled, and
     * dropped; what is kept is the text of its colors.
     */
    import ImagePicker from '#components/app/ImagePicker.svelte';
    import MIDIImporter from '#components/project/MIDIImporter.svelte';
    import MarkupHTMLView from '#components/concepts/MarkupHTMLView.svelte';
    import Note from '#components/app/Notice.svelte';
    import Button from '#components/widgets/Button.svelte';
    import Dialog from '#components/widgets/Dialog.svelte';
    import Slider from '#components/widgets/Slider.svelte';
    import Mode from '#components/widgets/Mode.svelte';
    import Tabbed from '#components/widgets/Tabbed.svelte';
    import { locales } from '#db/Database.ts';
    import type Project from '#db/projects/Project.ts';
    import { MAX_PROJECT_BYTE_SIZE } from '#db/projects/ProjectsDatabase.svelte.ts';
    import { toTable } from '#components/editor/commands/interpret.ts';
    import TextBox from '#components/widgets/TextBox.svelte';
    import freshSourceName from '#edit/freshSourceName.ts';
    import type LocaleText from '#locale/LocaleText.ts';
    import type { NameText } from '#locale/LocaleText.ts';
    import type Node from '#nodes/Node.ts';
    import type TableLiteral from '#nodes/TableLiteral.ts';
    import getPreferredSpaces from '#parser/getPreferredSpaces.ts';
    import {
        colorsToSource,
        DefaultResolution,
        estimateBytes,
        MaxResolution,
        MinResolution,
        ResolutionStep,
    } from '#edit/image/imageToColors.ts';
    import CameraCapture from '#components/project/CameraCapture.svelte';
    import type { Working } from '#components/app/ImagePicker.svelte';
    import { MinimumCrop, type Rect } from '#db/characters/raster.ts';
    import { untrack } from 'svelte';
    import { withoutAnnotations } from '#locale/withoutAnnotations.ts';
    import { first, must } from '#util/nullable.ts';

    interface Props {
        project: Project;
        editable: boolean;
        show: boolean;
        /** Make an empty source file. ProjectView's, because only it can expand the
         *  new tile — which an empty file wants and a picture's thousand colors
         *  very much does not. */
        addBlank: () => void;
        /** Put a project that has grown a source into the world. ProjectView's,
         *  because the new file needs a tile as well as a place in the project. */
        added: (project: Project, select?: Node) => void;
        /** Say something in the app's live region. */
        announce: (message: string) => void;
        /** A picture dropped on the project. Opens the dialog on the picture,
         *  already chosen; cleared once it has been dealt with. */
        picture?: File | null;
    }

    let {
        project,
        editable,
        show = $bindable(),
        addBlank,
        added,
        announce,
        picture = $bindable(null),
    }: Props = $props();

    const Ways = { Blank: 0, Image: 1, Table: 2, Song: 3 } as const;
    let way = $state<number>(Ways.Blank);

    /** Where the picture comes from. One tab rather than two, because cropping it and
     *  choosing how many colors it becomes is the same work either way — only where the
     *  picture arrives from differs. */
    const Sources = { Device: 0, Camera: 1 } as const;
    let pictureSource = $state<number>(Sources.Device);

    /** How many colors across the picture becomes. */
    let resolution = $state(DefaultResolution);
    /** A frozen camera frame, or nothing while the camera is live. */
    let captured = $state<Working | null>(null);
    /** The name of the picture last chosen from a file, for its doc. */
    let pictureName = $state<string | null>(null);
    /** Whatever has been pasted into the table box. */
    let pasted = $state('');
    /** What those rows read as, or nothing when they don't read as a table yet. The
     *  same decider the editor's own paste uses, so the two can't disagree. */
    let pastedTable = $derived(
        pasted.trim().length === 0 ? undefined : toTable(pasted),
    );

    /**
     * What a new source is called, in the locale's own word for what it holds.
     *
     * A locale's own word, so the file reads as a name in the language the creator is
     * writing in — and deliberately not the locale's word for the *type* it holds, since
     * a source of that name would shadow the very type it holds.
     */
    function nameFrom(accessor: (l: LocaleText) => NameText): string {
        const declared = $locales.getWithAnnotations(accessor);
        const names = Array.isArray(declared) ? declared : [declared];
        return withoutAnnotations(
            must(first(names), 'a name for a new source'),
        );
    }

    /**
     * Put a new source into the project: the file, a borrow of it at the top of main,
     * and a word about it.
     *
     * Text rather than nodes: splicing a parsed list back into a source rebuilds its
     * spacing and costs the square of what it holds, which is what made importing a song
     * hang before it was written this way. The tile is left collapsed, because an
     * unmounted tile renders nothing and a thousand colors is a thousand token views for
     * anyone who opens it.
     */
    function commit(name: string, code: string, said: string) {
        const grown = project.withNewSource(name, code);
        const main = grown.getMain();
        const before = main.code.toString();
        // The borrow goes at the top, because a program's borrows are parsed before
        // anything else. Without it the new source's names reach no scope at all.
        const revised = grown.withSource(
            main,
            main.withCode(`↓ ${name}\n${before}`),
        );
        // Analyzed here rather than left to fire once the dialog has closed: on a large
        // grid it is long enough that the silence would read as a freeze.
        revised.analyze();
        // Select the borrow, which is the one line in main that says where the new name
        // comes from. Without it the file was made and nothing on screen said how to use
        // it.
        added(revised, revised.getMain().expression.borrows[0]);
        announce(said);
        show = false;
    }

    /** What the project has room for, in bytes. */
    let room = $derived(MAX_PROJECT_BYTE_SIZE - project.getSourceByteSize());

    /**
     * Write the colors as a source file and borrow it from the program.
     *
     * Text, not nodes: splicing a parsed list back into a source rebuilds its
     * spacing and costs the square of what it holds, which is what made importing
     * a song hang before it was written this way. The tile is left collapsed,
     * because an unmounted tile renders nothing and a thousand colors is a
     * thousand token views for anyone who opens it.
     */
    function addColors(
        sampled: Uint8ClampedArray,
        columns: number,
        rows: number,
    ) {
        // Named after what it holds. A name from the locale rather than the file's,
        // which may be a camera frame with no name at all, and which is very often not
        // a name a creator could type.
        const name = freshSourceName(
            project,
            nameFrom((l) => l.ui.source.add.image.name),
        );
        const doc = (
            pictureName === null
                ? $locales.concretize((l) => l.ui.source.add.image.cameraDoc, {
                      columns,
                      rows,
                  })
                : $locales.concretize((l) => l.ui.source.add.image.doc, {
                      name: pictureName,
                      columns,
                      rows,
                  })
        ).toText();
        commit(
            name,
            colorsToSource(sampled, columns, rows, doc),
            $locales
                .concretize((l) => l.ui.source.add.image.added, {
                    name,
                    count: columns * rows,
                })
                .toText(),
        );
    }

    /**
     * Write the pasted rows as a source file and borrow it from the program.
     *
     * The same shape as the colors above — text rather than nodes, a doc with the blank
     * line under it, a borrow at the top of main, and the tile left collapsed.
     */
    function addTable(table: TableLiteral) {
        const name = freshSourceName(
            project,
            nameFrom((l) => l.ui.source.add.table.name),
        );
        const columns = table.type.columns.length;
        const rows = table.rows.length;
        const doc = $locales
            .concretize((l) => l.ui.source.add.table.doc, { columns, rows })
            .toText();
        commit(
            name,
            `¶${doc}¶\n\n${table.toWordplay(getPreferredSpaces(table))}\n`,
            $locales
                .concretize((l) => l.ui.source.add.table.added, { name, rows })
                .toText(),
        );
    }

    /** Reset whatever the last visit left behind, so opening the dialog is a fresh
     *  start — except a picture dropped on the project, which is why it opened. */
    $effect(() => {
        if (!show) return;
        untrack(() => {
            captured = null;
            pictureName = null;
            pasted = '';
            resolution = DefaultResolution;
            way = picture === null ? Ways.Blank : Ways.Image;
        });
    });
</script>

{#snippet sizing(
    sampled: Uint8ClampedArray,
    columns: number,
    rows: number,
    clear: () => void,
    rect: Rect,
    whole: Working,
    setRect: (rect: Rect) => void,
)}
    {@const bytes = estimateBytes(columns, rows)}
    {@const fits = bytes <= room}
    <!-- The keyboard's way to crop. The box starts as the whole picture, so until it is
         made smaller there is nowhere for the arrow keys to move it; these are what make
         it smaller, and change its shape, without a pointer. In percent of the picture,
         because the box is measured in pixels of a working copy nobody ever sees, and
         "25" of those means nothing to the person choosing. -->
    <Slider
        label={(l) => l.ui.source.add.image.crop.width.label}
        tip={(l) => l.ui.source.add.image.crop.width.tip}
        min={Math.min(1, MinimumCrop / whole.width)}
        max={1}
        increment={0.01}
        precision={0}
        unit={'%'}
        value={rect.width / whole.width}
        change={(value) =>
            setRect({
                ...rect,
                width: Math.round(value.toNumber() * whole.width),
            })}
    ></Slider>
    <Slider
        label={(l) => l.ui.source.add.image.crop.height.label}
        tip={(l) => l.ui.source.add.image.crop.height.tip}
        min={Math.min(1, MinimumCrop / whole.height)}
        max={1}
        increment={0.01}
        precision={0}
        unit={'%'}
        value={rect.height / whole.height}
        change={(value) =>
            setRect({
                ...rect,
                height: Math.round(value.toNumber() * whole.height),
            })}
    ></Slider>
    <Slider
        label={(l) => l.ui.source.add.image.size.label}
        tip={(l) => l.ui.source.add.image.size.tip}
        min={MinResolution}
        max={MaxResolution}
        increment={ResolutionStep}
        precision={0}
        unit={''}
        value={resolution}
        change={(value) => (resolution = value.toNumber())}
    ></Slider>
    <!-- One element, because the column this sits in is a flex column: the
         inline markup's own spans would each become a flex item on its own line. -->
    <div>
        <MarkupHTMLView
            inline
            markup={[
                (l) => l.ui.source.add.image.budget,
                {
                    columns,
                    rows,
                    // Never zero: a small picture is still worth a number, and
                    // "about 0 KB" reads as a measurement that failed.
                    size: `${Math.max(1, Math.round(bytes / 1024))}`,
                    percent: `${Math.max(1, Math.min(100, Math.round((100 * bytes) / MAX_PROJECT_BYTE_SIZE)))}%`,
                },
            ]}
        />
    </div>
    {#if !fits}
        <Note text={(l) => l.ui.source.add.image.tooBig} />
    {/if}
    <Button
        background
        active={editable && fits}
        tip={(l) => l.ui.source.add.image.button.tip}
        action={() => {
            addColors(sampled, columns, rows);
            // Both, because a dropped picture is held outside this component and
            // would otherwise be re-adopted the moment the dialog reopens.
            picture = null;
            clear();
        }}
        icon="✓"
        label={(l) => l.ui.source.add.image.button.label}
    />
{/snippet}

<Dialog
    bind:show
    id="addSource"
    header={(l) => l.ui.source.add.header}
    explanation={(l) => l.ui.source.add.explanation}
>
    <Tabbed
        tabs={(l) => l.ui.source.add.ways}
        choice={way}
        select={(choice) => (way = choice)}
    >
        {#if way === Ways.Blank}
            <div class="panel-column">
                <MarkupHTMLView
                    markup={(l) => l.ui.source.add.blank.explanation}
                />
                <!-- Salient because it is what the `+` used to do in one click:
                     the dialog is a question now, and this is its default answer.
                     The uiid is how a test asks for an empty file without knowing
                     the language the dialog is speaking. -->
                <Button
                    uiid="addBlankSource"
                    background="salient"
                    active={editable}
                    tip={(l) => l.ui.source.add.blank.button.tip}
                    action={() => {
                        addBlank();
                        show = false;
                    }}
                    icon="+"
                    label={(l) => l.ui.source.add.blank.button.label}
                />
            </div>
        {:else if way === Ways.Image}
            <div class="panel-column">
                <MarkupHTMLView
                    markup={(l) => l.ui.source.add.image.explanation}
                />
                <Mode
                    modes={(l) => l.ui.source.add.image.source}
                    choice={pictureSource}
                    select={(choice) => {
                        pictureSource = choice;
                        // Whatever was chosen belongs to the other source; keeping it
                        // would show a device picture under a live camera.
                        captured = null;
                        picture = null;
                        pictureName = null;
                    }}
                    icons={['🖼', '📷']}
                />
                {#if pictureSource === Sources.Camera && captured === null}
                    <CameraCapture capture={(frame) => (captured = frame)} />
                {:else}
                    <ImagePicker
                        grid={{ longEdge: resolution }}
                        instructions={(l) => l.ui.source.add.image.instructions}
                        given={pictureSource === Sources.Camera
                            ? captured
                            : picture}
                        choosable={pictureSource === Sources.Device}
                        {announce}
                        onchoose={(name) => (pictureName = name)}
                    >
                        {#snippet controls({
                            sampled,
                            columns,
                            rows,
                            clear,
                            rect,
                            source,
                            setRect,
                        })}
                            {#if pictureSource === Sources.Camera}
                                <Button
                                    tip={(l) =>
                                        l.ui.source.add.image.camera.retake.tip}
                                    action={() => {
                                        captured = null;
                                    }}
                                    icon="↺"
                                    label={(l) =>
                                        l.ui.source.add.image.camera.retake
                                            .label}
                                />
                            {/if}
                            {@render sizing(
                                sampled,
                                columns,
                                rows,
                                clear,
                                rect,
                                source,
                                setRect,
                            )}
                        {/snippet}
                    </ImagePicker>
                {/if}
            </div>
        {:else if way === Ways.Table}
            <div class="panel-column">
                <MarkupHTMLView
                    markup={(l) => l.ui.source.add.table.explanation}
                />
                <TextBox
                    id="add-source-table"
                    bind:text={pasted}
                    description={(l) => l.ui.source.add.table.paste.label}
                    placeholder={(l) => l.ui.source.add.table.paste.placeholder}
                    maxrows={8}
                />
                {#if pastedTable !== undefined}
                    {@const table = pastedTable}
                    <MarkupHTMLView
                        inline
                        markup={[
                            (l) => l.ui.source.add.table.summary,
                            {
                                columns: table.type.columns.length,
                                rows: table.rows.length,
                            },
                        ]}
                    />
                    <Button
                        background="salient"
                        active={editable}
                        tip={(l) => l.ui.source.add.table.button.tip}
                        action={() => {
                            addTable(table);
                            pasted = '';
                        }}
                        icon="✓"
                        label={(l) => l.ui.source.add.table.button.label}
                    />
                {:else if pasted.trim().length > 0}
                    <Note text={(l) => l.ui.source.add.table.notTable} />
                {/if}
            </div>
        {:else}
            <div class="panel-column">
                <MarkupHTMLView
                    markup={(l) => l.ui.source.add.song.explanation}
                />
                <MIDIImporter {project} {editable} {added} />
            </div>
        {/if}
    </Tabbed>
</Dialog>

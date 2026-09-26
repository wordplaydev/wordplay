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
    import ImagePicker from '@components/app/ImagePicker.svelte';
    import MIDIImporter from '@components/project/MIDIImporter.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Note from '@components/app/Notice.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import Slider from '@components/widgets/Slider.svelte';
    import Tabbed from '@components/widgets/Tabbed.svelte';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { MAX_PROJECT_BYTE_SIZE } from '@db/projects/ProjectsDatabase.svelte';
    import freshSourceName from '@edit/freshSourceName';
    import {
        colorsToSource,
        DefaultResolution,
        estimateBytes,
        MaxResolution,
        MinResolution,
        ResolutionStep,
    } from '@edit/image/imageToColors';
    import CameraCapture from '@components/project/CameraCapture.svelte';
    import type { Working } from '@components/app/ImagePicker.svelte';
    import { untrack } from 'svelte';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { first, must } from '@util/nullable';

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
        added: (project: Project) => void;
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

    const Ways = { Blank: 0, Picture: 1, Camera: 2, Song: 3 } as const;
    let way = $state<number>(Ways.Blank);

    /** How many colors across the picture becomes. */
    let resolution = $state(DefaultResolution);
    /** A frozen camera frame, or nothing while the camera is live. */
    let captured = $state<Working | null>(null);
    /** The name of the picture last chosen from a file, for its doc. */
    let pictureName = $state<string | null>(null);

    /**
     * What the source of colors is called.
     *
     * A locale's own word, so the file reads as a name in the language the creator
     * is writing in — and deliberately not the locale's word for `Color`, since a
     * source of that name shadows the very type it holds.
     */
    function nameOfColors(): string {
        const declared = $locales.getWithAnnotations(
            (l) => l.ui.source.add.picture.name,
        );
        const names = Array.isArray(declared) ? declared : [declared];
        return withoutAnnotations(
            must(first(names), 'a name for a source of colors'),
        );
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
        // Named after what it holds. A name from the locale's own basis rather
        // than the file's, which may be a camera frame with no name at all, and
        // which is very often not a name a creator could type.
        const name = freshSourceName(project, nameOfColors());
        const doc = (
            pictureName === null
                ? $locales.concretize(
                      (l) => l.ui.source.add.picture.cameraDoc,
                      { columns, rows },
                  )
                : $locales.concretize((l) => l.ui.source.add.picture.doc, {
                      name: pictureName,
                      columns,
                      rows,
                  })
        ).toText();

        const grown = project.withNewSource(
            name,
            colorsToSource(sampled, columns, rows, doc),
        );
        const main = grown.getMain();
        const before = main.code.toString();
        // The borrow goes at the top, because a program's borrows are parsed before
        // anything else. Without it the new source's names reach no scope at all.
        const revised = grown.withSource(
            main,
            main.withCode(`↓ ${name}\n${before}`),
        );
        // Analyzed here rather than left to fire once the dialog has closed: on a
        // large grid it is long enough that the silence would read as a freeze.
        revised.analyze();
        added(revised);

        announce(
            $locales
                .concretize((l) => l.ui.source.add.picture.added, {
                    name,
                    count: columns * rows,
                })
                .toText(),
        );
        show = false;
    }

    /** Reset whatever the last visit left behind, so opening the dialog is a fresh
     *  start — except a picture dropped on the project, which is why it opened. */
    $effect(() => {
        if (!show) return;
        untrack(() => {
            captured = null;
            pictureName = null;
            resolution = DefaultResolution;
            way = picture === null ? Ways.Blank : Ways.Picture;
        });
    });
</script>

{#snippet sizing(
    sampled: Uint8ClampedArray,
    columns: number,
    rows: number,
    clear: () => void,
)}
    {@const bytes = estimateBytes(columns, rows)}
    {@const fits = bytes <= room}
    <Slider
        label={(l) => l.ui.source.add.picture.size.label}
        tip={(l) => l.ui.source.add.picture.size.tip}
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
                (l) => l.ui.source.add.picture.budget,
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
        <Note text={(l) => l.ui.source.add.picture.tooBig} />
    {/if}
    <Button
        background
        active={editable && fits}
        tip={(l) => l.ui.source.add.picture.button.tip}
        action={() => {
            addColors(sampled, columns, rows);
            // Both, because a dropped picture is held outside this component and
            // would otherwise be re-adopted the moment the dialog reopens.
            picture = null;
            clear();
        }}
        icon="✓"
        label={(l) => l.ui.source.add.picture.button.label}
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
        {:else if way === Ways.Picture}
            <ImagePicker
                grid={{ longEdge: resolution }}
                instructions={(l) => l.ui.source.add.picture.instructions}
                given={picture}
                {announce}
                onchoose={(name) => (pictureName = name)}
            >
                {#snippet controls({ sampled, columns, rows, clear })}
                    {@render sizing(sampled, columns, rows, clear)}
                {/snippet}
            </ImagePicker>
        {:else if way === Ways.Camera}
            <div class="panel-column">
                {#if captured === null}
                    <CameraCapture capture={(frame) => (captured = frame)} />
                {:else}
                    <ImagePicker
                        grid={{ longEdge: resolution }}
                        instructions={(l) =>
                            l.ui.source.add.picture.instructions}
                        given={captured}
                        choosable={false}
                        {announce}
                    >
                        {#snippet controls({ sampled, columns, rows, clear })}
                            <Button
                                tip={(l) => l.ui.source.add.camera.retake.tip}
                                action={() => {
                                    captured = null;
                                }}
                                icon="↺"
                                label={(l) =>
                                    l.ui.source.add.camera.retake.label}
                            />
                            {@render sizing(sampled, columns, rows, clear)}
                        {/snippet}
                    </ImagePicker>
                {/if}
            </div>
        {:else}
            <MIDIImporter {project} {editable} {added} />
        {/if}
    </Tabbed>
</Dialog>

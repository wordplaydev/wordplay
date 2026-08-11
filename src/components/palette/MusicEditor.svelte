<script lang="ts">
    /**
     * The music editor: one track at a time on a staff that draws them all,
     * with the track's own properties beneath it.
     *
     * A carousel rather than a stack of staves, because a palette is a column
     * about a hand's width and several staves at once would each be too short
     * to read a pitch off — so the other tracks share this one, drawn for
     * reference. Editing is always about one track; the music's own properties
     * are the palette rows above this.
     *
     * Rendered by `Palette.svelte` after the music's property rows, the way
     * `TextStyleEditor` is rendered after a phrase's face — a bespoke editor
     * rather than a `property.type`, since what it edits is a list of lists.
     */
    import { Projects } from '@db/projects/Projects';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Note from '@components/widgets/Note.svelte';
    import EditableSheet from '@components/palette/EditableSheet.svelte';
    import PaletteProperty from '@components/palette/PaletteProperty.svelte';
    import {
        getKeyboardEditIdle,
        getResetKeyboardIdle,
        getSelectedOutput,
        IdleKind,
    } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import readMusic, {
        isEditable,
        musicSignature,
    } from '@edit/output/editableMusic';
    import { getTrackProperties } from '@edit/output/MusicProperties';
    import {
        inserted,
        moved as movedEntry,
        removed,
        chorded,
        isChord,
        replaced,
        transposed,
        unchorded,
        withDegreeAt,
        withDuration,
        entryFor,
    } from '@edit/output/editNotes';
    import OutputExpression from '@edit/output/OutputExpression';
    import OutputPropertyValueSet from '@edit/output/OutputPropertyValueSet';
    import Evaluate from '@nodes/Evaluate';
    import ListLiteral from '@nodes/ListLiteral';
    import type Node from '@nodes/Node';
    import NumberLiteral from '@nodes/NumberLiteral';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import {
        ERASE_SYMBOL,
        LIST_CLOSE_SYMBOL,
        LIST_OPEN_SYMBOL,
        MUSIC_SYMBOL,
        TRACK_SYMBOL,
    } from '@parser/Symbols';
    import { firstSoundingBeat, noteOnset } from '@output/Music/musicData';
    import {
        isPreviewing,
        pause as pausePreview,
        play as playPreview,
        previewPosition,
        revise as revisePreview,
        stop as stopPreview,
        wrapPlayhead,
    } from '@output/Music/previewPlayer';
    import type { NoteData } from '@output/Music/musicData';
    import RecordingStudio from '@components/palette/RecordingStudio.svelte';
    import Unit from '@nodes/Unit';
    import { PlainDurations, Quarter } from '@output/Music/durations';
    import Mode from '@components/widgets/Mode.svelte';
    import { get } from 'svelte/store';

    interface Props {
        project: Project;
        /** The `Music(…)` expression being edited. */
        music: Evaluate;
        editable: boolean;
    }

    let { project, music, editable }: Props = $props();

    const selection = getSelectedOutput();

    /**
     * The same idle machinery the editor drives from the keyboard.
     *
     * Without it every note moved was a discrete change, so ProjectView
     * re-analyzed the music's whole source, rebuilt the concept index, and
     * built a fresh evaluator — recompiling the source as it went — before the
     * next frame. Those are exactly the three things a keystroke defers, and a
     * note dragged across a staff is a flurry in the same way typing is.
     */
    const keyboardEditIdle = getKeyboardEditIdle();
    const resetKeyboardIdle = getResetKeyboardIdle();

    /** Mark an edit as part of a flurry, so the heavy work waits for a pause. */
    function deferAnalysis() {
        if (resetKeyboardIdle) resetKeyboardIdle();
        if (keyboardEditIdle && get(keyboardEditIdle) !== IdleKind.Typing)
            keyboardEditIdle.set(IdleKind.Typing);
    }

    /**
     * The most notes a music may have and still be laid out again after an
     * edit. Well under where the quadratic in #1265 becomes noticeable, and
     * far above any music written by hand.
     */
    const MaxTidyNotes = 500;

    /** Which track the carousel is showing. Kept by index rather than by node,
     * since every edit mints new nodes. */
    let at = $state(0);

    /**
     * Which note value the picker is set to: the length a click places, and
     * the length a chosen value gives the focused note.
     *
     * A quarter note by default, since that is one beat and a bare number in a
     * track already means one beat.
     */
    let duration = $state(2);

    /** The note the staff has focus on, so the toolbar can act on it. */
    let focusedNote = $state<{ index: number; voice: number } | undefined>(
        undefined,
    );

    function makeChord() {
        if (track === undefined || focusedEntry === undefined) return;
        reviseNotes(
            replaced(
                track.entries,
                focusedNote?.index ?? 0,
                chorded(focusedEntry),
            ),
        );
    }

    function unmakeChord() {
        if (track === undefined || focusedEntry === undefined) return;
        reviseNotes(
            replaced(
                track.entries,
                focusedNote?.index ?? 0,
                unchorded(focusedEntry),
            ),
        );
    }

    /** The five plain note values, in the order the picker shows them. */
    const Durations = PlainDurations.map((value) => value.unit);

    /** Give the picked value to the focused note, and use it for the next one. */
    function pickDuration(choice: number) {
        duration = choice;
        if (track === undefined || focusedNote === undefined) return;
        const entry = track.entries[focusedNote.index];
        if (entry === undefined) return;
        reviseNotes(
            replaced(
                track.entries,
                focusedNote.index,
                withDuration(entry, unitOf(choice)),
            ),
        );
    }

    /** The unit a picked value writes. A quarter note is one beat, which is
     * what a bare number already means, so it is written bare. */
    function unitOf(choice: number): Unit | undefined {
        const name = Durations[choice];
        return name === undefined || name === Quarter
            ? undefined
            : Unit.create([name]);
    }

    /**
     * The music as the editor sees it, re-read only when it has actually
     * changed.
     *
     * `readMusic` walks every note, and this runs on every project change —
     * every keystroke anywhere in the program, not just in the music. On an
     * imported song of several thousand notes that was tens of milliseconds a
     * key. The signature is a handful of node identities, so the check is
     * nearly free and the walk happens only when the music is what moved.
     */
    let cached:
        { key: string; value: ReturnType<typeof readMusic> } | undefined;
    let read = $derived.by(() => {
        const key = musicSignature(project, music);
        if (cached?.key === key) return cached.value;
        const value = readMusic(project, music);
        cached = { key, value };
        return value;
    });
    let tracks = $derived(read?.tracks ?? []);
    let index = $derived(Math.max(0, Math.min(at, tracks.length - 1)));
    let track = $derived(tracks[index]);
    /** The rest of the music, which the staff draws behind the edited track so
     * a part can be written against the ones it plays with. */
    let others = $derived(tracks.filter((_, which) => which !== index));

    /** The focused note's own expression, when there is one. */
    let focusedEntry = $derived(
        focusedNote === undefined
            ? undefined
            : track?.entries[focusedNote.index],
    );

    /**
     * Point the editor's selection outline at the focused note rather than at
     * the whole music, which spans several lines once it has a few tracks and
     * says nothing about which note is being edited.
     */
    $effect(() => {
        selection?.setFocus(project, focusedEntry);
    });

    $effect(() => () => selection?.setFocus(project, undefined));

    /** The track's own palette rows, built the way Palette builds the music's. */
    let trackValues = $derived.by(() => {
        if (track === undefined) return [];
        const output = new OutputExpression(project, track.evaluate, $locales);
        return getTrackProperties(project, $locales).map((property) => ({
            property,
            values: new OutputPropertyValueSet(property, [output], $locales),
        }));
    });

    /**
     * Apply an edit, then lay the music's own expression out again.
     *
     * A music grows a track and a note at a time and quickly outgrows one
     * line, so the notes being edited scroll off the side of the editor. Only
     * the music's subtree is reformatted — `getPreferredSpaces` takes any node
     * and rewrites the spacing of its tokens alone — so an edit here never
     * reformats code the creator laid out themselves elsewhere. Both changes
     * go through one revise, so tidying isn't a second thing to undo.
     */
    function reviseMusic(
        replacements: [Node, Node | undefined][],
        /** False while a gesture is still going, so a whole drag is one undo
         * step rather than one per frame — `remember: false` replaces the top
         * history entry instead of pushing another. */
        remember = true,
    ) {
        const revised = project.withRevisedNodes(replacements);
        // The source of what was *replaced*, not of the music: a track may live
        // in another source — which is where an import puts it — and tidying
        // the music's source would lay out a file the edit never touched.
        const [replaced] = replacements;
        const source = revised.getSourceOf(
            revised.getRoot(replaced?.[0] ?? music)?.root ?? music,
        );
        // Skipped past a certain size, because `getPreferredSpaces` is
        // quadratic in the width of a list (#1265): it asks each token which
        // field it belongs to, and that answer is a linear scan of the field.
        // On an imported music of several thousand notes one keystroke would
        // hang the tab. Laying the code out is a convenience; a note that can
        // be moved is not.
        const notes = tracks.reduce(
            (total, t) => total + t.data.notes.length,
            0,
        );
        const tidied =
            source === undefined || notes > MaxTidyNotes
                ? revised
                : revised.withSource(
                      source,
                      source.withSpaces(
                          getPreferredSpaces(music, source.spaces),
                      ),
                  );
        deferAnalysis();
        Projects.reviseProject(tidied, remember);
    }

    /** Rewrite the shown track's note list. */
    function reviseNotes(
        entries: ReturnType<typeof inserted>,
        remember = true,
    ) {
        if (track?.notes === undefined) return;
        reviseMusic([[track.notes, ListLiteral.make(entries)]], remember);
    }

    function add(index: number, degree: number) {
        if (track === undefined) return;
        reviseNotes(inserted(track.entries, index, degree, unitOf(duration)));
    }

    function remove(index: number) {
        if (track === undefined) return;
        reviseNotes(removed(track.entries, index));
    }

    /** Move a note by degrees; `voice` moves one note of a chord, undefined
     * every note in it. */
    function move(
        index: number,
        steps: number,
        voice: number | undefined,
        remember = true,
    ) {
        if (track === undefined) return;
        const entry = track.entries[index];
        if (entry === undefined) return;
        const next =
            voice === undefined
                ? transposed(entry, steps)
                : withDegreeAt(entry, voice, (degree) => degree + steps);
        reviseNotes(replaced(track.entries, index, next), remember);
    }

    /**
     * Where the preview starts: the beat of the focused note.
     *
     * The focused note *is* the composing cursor. A separate slider would be a
     * second way to say the same thing, and this one is reachable from the
     * keyboard without being built.
     */
    /**
     * The beat playing starts from.
     *
     * Settable rather than derived: focusing a note moves it, dragging the
     * line on the staff moves it, and changing track resets it — three ways to
     * say the same thing, and none of them a function of the others.
     */
    let cursor = $state(0);

    /**
     * Put the cursor at the start of the music when the carousel moves to
     * another track.
     *
     * Keyed on which track, not on the track itself: an edit replaces the
     * track's nodes, so an identity check would drag the cursor back to the
     * top of the track on every note placed — the same mistake the staff's
     * scroll position made.
     */
    let cursorFor: number | undefined = undefined;
    $effect(() => {
        if (track === undefined || index === cursorFor) return;
        cursorFor = index;
        // Not beat zero: an imported track entering late opens with hundreds
        // of beats of rest, and playing from zero is silence.
        cursor = firstSoundingBeat(track.data) ?? 0;
    });

    /** Which of the two play buttons started the preview, so only that one
     * shows as playing and pressing the other switches rather than stops. */
    let playingWhat = $state<'music' | 'track' | undefined>(undefined);

    /** Where the head sits in the written piece, wrapped for a looping one. */
    function wrapped(beat: number | undefined): number | undefined {
        if (beat === undefined || track === undefined) return undefined;
        return wrapPlayhead(
            beat,
            playingWhat === 'track' ? [track.data] : (read?.data.tracks ?? []),
        );
    }

    /** Back to the start of the song — a long import is a long way to scrub. */
    function rewind() {
        cursor = 0;
        if ($isPreviewing && read !== undefined && track !== undefined)
            playPreview(
                playingWhat === 'track'
                    ? { ...read.data, tracks: [track.data] }
                    : read.data,
                0,
            );
    }

    function toggle(what: 'music' | 'track') {
        if ($isPreviewing && playingWhat === what) {
            // Leave the cursor where the music stopped, which is where pressing
            // play again resumes. Read before pausing, since pausing clears it.
            cursor = wrapped($previewPosition) ?? cursor;
            pausePreview();
            playingWhat = undefined;
            return;
        }
        if (read === undefined || track === undefined) return;
        playingWhat = what;
        playPreview(
            what === 'music'
                ? read.data
                : // One track alone, for hearing a part against nothing.
                  { ...read.data, tracks: [track.data] },
            cursor,
        );
    }

    // Follow edits while playing, so a change is heard without restarting.
    $effect(() => {
        if (!$isPreviewing || read === undefined) return;
        revisePreview(
            playingWhat === 'track' && track !== undefined
                ? { ...read.data, tracks: [track.data] }
                : read.data,
        );
    });

    // A preview belongs to the editor that started it.
    $effect(() => () => {
        stopPreview();
        playingWhat = undefined;
    });

    /** Move a note one place through the list, for a horizontal drag. */
    function reorder(index: number, direction: 1 | -1, remember = true) {
        if (track === undefined) return;
        reviseNotes(movedEntry(track.entries, index, direction), remember);
    }

    /** Append transcribed notes to the end of the track being edited. */
    function appendNotes(notes: readonly NoteData[]) {
        if (track === undefined) return;
        const Note = project.shares.output.Note.getReference($locales);
        reviseNotes([
            ...track.entries,
            ...notes.map((note) => entryFor(note, Note)),
        ]);
    }

    function clear() {
        if (track?.notes === undefined) return;
        reviseMusic([[track.notes, ListLiteral.make([])]]);
    }

    /** Add a track after the one shown, seeded so it has something to edit. */
    function addTrack() {
        if (read === undefined) return;
        const Track = project.shares.output.Track;
        const fresh = Evaluate.make(Track.getReference($locales), [
            ListLiteral.make([NumberLiteral.make(1)]),
        ]);
        const given = music.getInput(
            project.shares.output.Music.inputs[0],
            project.getNodeContext(music),
        );
        // `tracks` is `[🎶]|🎶`, so a lone track isn't in a list yet; wrapping
        // it is what makes room for a second.
        const list =
            given instanceof ListLiteral
                ? ListLiteral.make([...given.values, fresh])
                : given === undefined || Array.isArray(given)
                  ? ListLiteral.make([fresh])
                  : ListLiteral.make([given, fresh]);
        reviseMusic([
            [
                music,
                music.withBindAs(
                    project.shares.output.Music.inputs[0],
                    list,
                    project.getNodeContext(music),
                ),
            ],
        ]);
        at = tracks.length;
    }

    function removeTrack() {
        if (read === undefined || track === undefined) return;
        const given = music.getInput(
            project.shares.output.Music.inputs[0],
            project.getNodeContext(music),
        );
        if (!(given instanceof ListLiteral)) return;
        reviseMusic([
            [
                given,
                ListLiteral.make(
                    given.values.filter((value) => value !== track.evaluate),
                ),
            ],
        ]);
        at = Math.max(0, index - 1);
    }
</script>

{#if track !== undefined}
    <div class="music">
        <div class="tracks">
            <Button
                tip={(l) => l.ui.palette.button.previousTrack}
                active={editable && index > 0}
                action={() => {
                    at = index - 1;
                }}
                icon="◀"
            ></Button>
            <span class="count"
                ><MarkupHtmlView
                    inline
                    markup={[
                        (l) => l.ui.palette.music.track,
                        { count: index + 1, total: `${tracks.length}` },
                    ]}
                /></span
            >
            <Button
                tip={(l) => l.ui.palette.button.nextTrack}
                active={editable && index < tracks.length - 1}
                action={() => {
                    at = index + 1;
                }}
                icon="▶"
            ></Button>
        </div>

        <!-- What acts on the track being shown, kept off the row that chooses
             which track that is. -->
        <div class="tracks">
            <Button
                tip={(l) => l.ui.palette.button.addTrack}
                active={editable}
                action={addTrack}
                icon={`+${TRACK_SYMBOL}`}
                background
            ></Button>
            <Button
                tip={(l) => l.ui.palette.button.removeTrack}
                active={editable && tracks.length > 1}
                action={removeTrack}
                icon={`${ERASE_SYMBOL}${TRACK_SYMBOL}`}
                background
            ></Button>
            <Button
                tip={(l) => l.ui.palette.button.rewind}
                active={editable && cursor > 0}
                action={rewind}
                icon="⏮"
                background
            ></Button>
            <Button
                tip={(l) =>
                    $isPreviewing && playingWhat === 'music'
                        ? l.ui.palette.button.pauseMusic
                        : l.ui.palette.button.playMusic}
                active={(editable || $isPreviewing) &&
                    !($isPreviewing && playingWhat === 'track')}
                action={() => toggle('music')}
                icon={`${$isPreviewing && playingWhat === 'music' ? '⏸' : '▶'}${MUSIC_SYMBOL}`}
                uiid="playMusic"
                background
            ></Button>
            <Button
                tip={(l) =>
                    $isPreviewing && playingWhat === 'track'
                        ? l.ui.palette.button.pauseTrack
                        : l.ui.palette.button.playTrack}
                active={(editable || $isPreviewing) &&
                    !($isPreviewing && playingWhat === 'music')}
                action={() => toggle('track')}
                icon={`${$isPreviewing && playingWhat === 'track' ? '⏸' : '▶'}${TRACK_SYMBOL}`}
                uiid="playTrack"
                background
            ></Button>
            <RecordingStudio {editable} append={appendNotes} />
            <!-- An emptied list, not a tidied one: the broom is what the
                 editor uses for pretty-printing. -->
            <Button
                tip={(l) => l.ui.palette.button.clearTrack}
                active={editable && track.data.notes.length > 0}
                action={clear}
                icon={`${LIST_OPEN_SYMBOL}${ERASE_SYMBOL}${LIST_CLOSE_SYMBOL}`}
                background
            ></Button>
        </div>

        {#if isEditable(track)}
            <div class="notes">
                <Mode
                    modes={(l) => l.ui.palette.music.duration}
                    choice={duration}
                    select={pickDuration}
                    active={editable && focusedNote !== undefined}
                    labeled={false}
                />
                <!-- Two buttons rather than one that changes meaning: which
                     one is available says whether the focused note is a chord,
                     which a single toggling button can only say by its icon. -->
                <Button
                    tip={(l) => l.ui.palette.button.makeChord}
                    active={editable &&
                        focusedEntry !== undefined &&
                        !isChord(focusedEntry)}
                    action={makeChord}
                    icon="♫"
                    background
                ></Button>
                <Button
                    tip={(l) => l.ui.palette.button.unmakeChord}
                    active={editable &&
                        focusedEntry !== undefined &&
                        isChord(focusedEntry)}
                    action={unmakeChord}
                    icon="♪"
                    background
                ></Button>
            </div>
            <EditableSheet
                {track}
                trackIndex={index}
                {others}
                {editable}
                {add}
                {remove}
                {move}
                {reorder}
                {cursor}
                playhead={wrapped($previewPosition)}
                playing={$isPreviewing ? playingWhat : undefined}
                onCursor={(beat) => (cursor = beat)}
                onFocus={(note) => {
                    focusedNote = note;
                    // Focusing a note is also a way of saying where to play
                    // from, which is what a creator auditioning a passage
                    // means by clicking one.
                    if (note !== undefined && track !== undefined)
                        cursor = noteOnset(track.data, note.index);
                }}
            />
        {:else}
            <!-- A computed note list has no node per note to replace, so there
                 is nowhere for a click to write. Same wording the palette uses
                 for any computed property. -->
            <Note
                ><LocalizedText
                    path={(l) => l.ui.palette.music.computed}
                /></Note
            >
        {/if}

        {#each trackValues as { property, values } (property)}
            <PaletteProperty {project} {property} {values} {editable} />
        {/each}
    </div>
{/if}

<style>
    .music {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: start;
        width: 100%;
    }

    .tracks {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        flex-wrap: wrap;
    }

    .count {
        white-space: nowrap;
    }

    .notes {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        flex-wrap: wrap;
    }
</style>

<script lang="ts">
    /**
     * One track's notes on a staff, editable by pointer and keyboard.
     *
     * Built on `sheet.ts`'s geometry, which the read-only stage rendering uses
     * too, so a note sits in the same place in both. The stage's `Sheet.svelte`
     * itself isn't reusable here: it is `pointer-events: none`, `aria-hidden`,
     * absolutely positioned against the stage, and driven by the evaluator's
     * playhead rather than by a selection.
     *
     * Unlike the stage version this scrolls for real rather than transforming a
     * strip, because there is no playhead to follow — the creator decides what
     * part of the track to look at.
     *
     * **Focus is a note *within* an entry, not an entry.** A chord draws one
     * notehead per degree, and each is separately reachable and separately
     * movable, so everything here is keyed by `(entry, voice)`. Keying by entry
     * alone would make the two noteheads of a chord fight over one element.
     */
    import exceedsMoveThreshold from '@components/output/moveThreshold';
    import {
        getAnnouncer,
        getSelectedOutput,
    } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { animationFactor, locales } from '@db/Database';
    import type { EditableTrack } from '@edit/output/editableMusic';
    import { degreeText } from '@edit/output/editNotes';
    import {
        firstSoundingBeat,
        indexAtBeat,
        trackLength,
    } from '@output/Music/musicData';
    import {
        beatAtX,
        degreeForStep,
        glyphFor,
        marksOf,
        placeStep,
        staffCenterOf,
        staffLines,
        stepAtPlace,
        TrebleClef,
        type Mark,
    } from '@output/Music/sheet';
    import { flip } from 'svelte/animate';

    /** Where the caret is: an entry, and which of its degrees. */
    type At = { index: number; voice: number };

    interface Props {
        track: EditableTrack;
        editable: boolean;
        /** Add a note of `degree` before entry `index`. */
        add: (index: number, degree: number) => void;
        /** Remove entry `index`. */
        remove: (index: number) => void;
        /**
         * Move entry `index` by degrees. `voice` moves one note of a chord;
         * undefined moves every note in it.
         */
        move: (
            index: number,
            steps: number,
            voice: number | undefined,
            remember?: boolean,
        ) => void;
        /** Move entry `index` one place through the list. */
        reorder: (index: number, direction: 1 | -1, remember?: boolean) => void;
        /** The beat the preview would start from, drawn as a cursor. */
        cursor?: number;
        /** Where playing has reached, drawn as a moving playhead. */
        playhead?: number | undefined;
        /** Set the beat playing would start from. */
        onCursor?: (beat: number) => void;
        /** Told which note holds focus, so the toolbar can act on it. */
        onFocus?: (at: At | undefined) => void;
    }

    let {
        track,
        editable,
        add,
        remove,
        move,
        reorder,
        cursor = 0,
        playhead = undefined,
        onCursor = undefined,
        onFocus = undefined,
    }: Props = $props();

    const announce = getAnnouncer();
    const selection = getSelectedOutput();

    /** Pixels per beat. Fixed rather than fitted, so a long track scrolls
     * instead of squeezing its notes into an unreadable smear. */
    const PerBeat = 44;
    /** The staff's drawn height; `--note` and the step band derive from it. */
    const Height = 132;
    /** The glyph size everything on the staff is measured in. */
    const NoteSize = Height / 5;
    /**
     * How far the music is inset to leave room for the clef.
     *
     * Shared by what draws and what hit-tests, because they have to agree:
     * noteheads and the cursor were offset by this in CSS while `pointAt` mapped
     * raw x straight to a beat, so every click landed almost a whole beat
     * (39.6px of a 44px beat) later than where it was aimed — for placing a note
     * as much as for scrubbing.
     */
    const ClefInset = NoteSize * 1.5;
    /** How far one Alt+arrow bends a note, in degrees. */
    const BendStep = 0.1;

    /** The separator `marksOf` joins a mark's id fields with. Written as an
     * escape rather than the character itself, which would make this file
     * binary to every tool that reads it. */
    const SEP = '\u0000';

    let region: HTMLElement | undefined = $state(undefined);

    /** Which note holds keyboard focus, so the staff is one tab stop. */
    let focused: At = $state({ index: 0, voice: 0 });
    /**
     * Whether the staff believes it holds keyboard focus.
     *
     * Every edit revises the project, which rebuilds the noteheads and drops
     * focus on the floor — the same round trip that makes every palette editor
     * restore focus by hand. Restoring it needs to be a standing claim rather
     * than a one-shot request: a request is consumed by the render that happens
     * *before* the edit lands, leaving nothing pending for the rebuild that
     * actually replaced the element. This flag is re-asserted after every
     * rebuild until the creator moves focus somewhere real.
     */
    let owned = $state(false);
    /**
     * The notehead for a slot, found in the DOM rather than collected through
     * `bind:this`.
     *
     * Moving a note replaces its node, so its notehead is destroyed and rebuilt
     * with the same slot — and the destroy writes `undefined` into the map
     * after the create has written the new element, leaving nothing to focus.
     * That is why repeated arrow presses lost focus after the first. Reading
     * the DOM asks the question at the moment it matters instead.
     */
    function viewAt(at: At): HTMLElement | null | undefined {
        return region?.querySelector(`[data-note="${slot(at)}"]`);
    }

    /**
     * A note being dragged: where it started, and what it has already
     * committed, so each frame applies only the difference.
     *
     * Captured once at pointerdown rather than re-read from the DOM per frame —
     * the drawn notes lag the project by one revise, so re-querying them
     * mid-gesture makes a drag fight itself.
     */
    let dragging:
        | {
              index: number;
              voice: number;
              whole: boolean;
              startX: number;
              startY: number;
              startStep: number;
              steps: number;
              places: number;
              moved: boolean;
              /** Whether this gesture has pushed a history entry yet. */
              committed: boolean;
          }
        | undefined = $state(undefined);

    let data = $derived({
        name: '',
        tempo: 120,
        volume: 1,
        key: track.data.key,
        scale: track.data.scale,
        replay: false,
        pause: false,
        description: undefined,
        // Drawn as a one-shot however the track loops: the editor shows the
        // notes that were written, not the repetitions they play as.
        tracks: [{ ...track.data, loop: false }],
    });

    let beats = $derived(Math.max(trackLength(track.data), 1));
    let width = $derived((beats + 1) * PerBeat);

    /**
     * How far the staff has been scrolled, so only what can be seen is built.
     *
     * A track imported from a MIDI file can hold tens of thousands of notes,
     * and a notehead is a focusable element with an animation — building them
     * all locked the tab with no way back. The stage's rendering has always
     * windowed for the same reason; this one didn't, which is what made an
     * import that converted in six milliseconds appear to hang.
     */
    let scrolled = $state(0);
    let visible = $state(0);

    /** Beats either side of the view, so scrolling doesn't reveal a gap
     * before the next frame fills it. */
    const Overscan = 8;

    let from = $derived(Math.max(0, Math.floor(scrolled / PerBeat) - Overscan));
    let to = $derived(
        Math.min(
            beats,
            Math.ceil((scrolled + (visible || 600)) / PerBeat) + Overscan,
        ),
    );

    let marks = $derived(marksOf([data], from, to));

    /**
     * The staff's centre, measured once over the whole track rather than over
     * the window: centring on what happens to be in view would slide every
     * note vertically as the creator scrolled.
     */
    let center = $derived(
        staffCenterOf(marksOf([data], 0, Math.min(beats, 64))),
    );

    function slot(at: At): string {
        return `${at.index}:${at.voice}`;
    }

    /** A mark's entry index and voice, which its id's fields carry. */
    function atOf(mark: Mark): At {
        const parts = mark.id.split(SEP);
        return { index: Number(parts[3] ?? 0), voice: Number(parts[4] ?? 0) };
    }

    /**
     * A key that follows a note through an edit, so inserting one slides its
     * neighbours instead of replacing them.
     *
     * A mark's own id counts entries by position, so inserting at the front
     * renumbers every note after it and each reads as a different note — which
     * is exactly what stops an animation from happening. A revise preserves the
     * identity of the nodes it didn't touch, so the note's source node is the
     * thing that actually stayed the same.
     */
    function keyOf(mark: Mark): string {
        const parts = mark.id.split(SEP);
        const entry = track.entries[Number(parts[3] ?? 0)];
        return [entry?.id ?? parts[3], parts[4], parts[5]].join(SEP);
    }

    /**
     * Inset from both edges, because a notehead is placed by its middle: at 0%
     * or 100% half the glyph sits outside the staff and is clipped away, which
     * is what a very high or very low note was doing. The read-only stage
     * rendering carries the same two constants for the same reason.
     */
    const TopInset = 12;
    const BottomInset = 12;

    function heightOf(step: number | undefined): number {
        return (
            TopInset +
            placeStep(step ?? center, center) * (100 - TopInset - BottomInset)
        );
    }

    /** How many degrees an entry sounds; a rest sounds none. */
    function voicesIn(index: number): number {
        return Math.max(1, track.data.notes[index]?.degrees.length ?? 1);
    }

    /** Where a pointer landed, in beats and staff steps. */
    function pointAt(event: PointerEvent | MouseEvent): {
        beat: number;
        step: number;
    } {
        const box = region?.getBoundingClientRect();
        if (box === undefined) return { beat: 0, step: center };
        return {
            beat: beatAtX(
                event.clientX -
                    box.left -
                    ClefInset +
                    (region?.scrollLeft ?? 0),
                PerBeat,
            ),
            step: Math.round(
                stepAtPlace((event.clientY - box.top) / box.height, center),
            ),
        };
    }

    /** The beat an entry starts on, for describing it. */
    function beatOf(index: number): number {
        let beat = 0;
        for (let at = 0; at < index; at++) beat += track.data.notes[at].beats;
        return beat;
    }

    function describe(index: number) {
        const note = track.data.notes[index];
        const beat = `${beatOf(index)}`;
        return note === undefined || note.degrees.length === 0
            ? $locales.concretize((l) => l.ui.palette.music.rest, { beat })
            : $locales.concretize((l) => l.ui.palette.music.note, {
                  degree: note.degrees.map(degreeText).join(' '),
                  beat,
              });
    }

    /** Announce an edit. Every message names what changed — a degree, or the
     * count the track now holds — so two edits in a row never produce the same
     * string, which a live region reads once and then falls silent on. */
    function say(message: string) {
        if (announce && $announce)
            $announce('note-edit', $locales.getLanguages()[0], message);
    }

    function sayMoved(index: number, degrees: readonly number[]) {
        say(
            $locales
                .concretize((l) => l.ui.palette.music.moved, {
                    degree: degrees.map(degreeText).join(' '),
                    beat: `${beatOf(index)}`,
                })
                .toText(),
        );
    }

    /** Claim focus for a note. Held until the creator moves it somewhere real. */
    function focusNote(at: At) {
        const last = track.data.notes.length - 1;
        if (last < 0) {
            owned = false;
            onFocus?.(undefined);
            return;
        }
        const index = Math.max(0, Math.min(at.index, last));
        const voice = Math.max(0, Math.min(at.voice, voicesIn(index) - 1));
        focused = { index, voice };
        owned = true;
        // Report immediately as well as on the element's own focus event: the
        // toolbar acts on which note is being edited and shouldn't have to wait
        // for the notehead to be rebuilt to know.
        onFocus?.(focused);
    }

    $effect(() => {
        visible = region?.clientWidth ?? 0;
    });

    /**
     * Show the track's first note when the track changes.
     *
     * An imported track that enters late opens with a long rest, so the staff
     * would otherwise start on empty space with the music somewhere off to the
     * right. Only on a change of track, so it never fights a creator who has
     * scrolled somewhere deliberately.
     */
    let shown: EditableTrack | undefined = undefined;
    $effect(() => {
        if (track === shown) return;
        shown = track;
        const first = firstSoundingBeat(track.data);
        if (first === undefined || region === undefined) return;
        // A little before it, so the first note isn't jammed against the clef.
        region.scrollLeft = Math.max(0, (first - 1) * PerBeat);
        scrolled = region.scrollLeft;
    });

    $effect(() => {
        // Read the marks so this re-runs after every edit rebuilds them, which
        // is when the element holding focus has just been replaced.
        void marks;
        if (!owned) return;
        const view = viewAt(focused);
        if (view === null || view === undefined) return;
        if (document.activeElement === view) return;
        setKeyboardFocus(view, 'Restoring note focus after an edit.');
    });

    /** Move focus across the notes of the track, chord members included. */
    function step(at: At, direction: 1 | -1): At {
        const voice = at.voice + direction;
        if (voice >= 0 && voice < voicesIn(at.index))
            return { index: at.index, voice };
        const index = at.index + direction;
        if (index < 0 || index >= track.data.notes.length) return at;
        return {
            index,
            voice: direction === 1 ? 0 : voicesIn(index) - 1,
        };
    }

    function handleKey(event: KeyboardEvent, at: At) {
        if (!editable) return;
        const note = track.data.notes[at.index];
        if (note === undefined) return;

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            const direction = event.key === 'ArrowUp' ? 1 : -1;
            // Alt bends by a fraction of a degree, which the note model already
            // understands: it sounds as two notes or as one bent note depending
            // on the track's mash.
            const amount = direction * (event.altKey ? BendStep : 1);
            // Shift moves the whole chord, the way it moves the whole entry
            // sideways — one modifier meaning "all of it" in both directions.
            const voice = event.shiftKey ? undefined : at.voice;
            move(at.index, amount, voice);
            sayMoved(
                at.index,
                note.degrees.map((degree, which) =>
                    voice === undefined || which === voice
                        ? degree + amount
                        : degree,
                ),
            );
            // Re-request focus: the moved note is a new node, so its element is
            // replaced and focus would otherwise be lost after one press.
            focusNote(at);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            if (event.shiftKey) {
                // Shift moves the note through the list rather than the focus.
                const to = at.index + direction;
                if (to < 0 || to >= track.data.notes.length) return;
                reorder(at.index, direction);
                say(
                    $locales
                        .concretize((l) => l.ui.palette.music.moved, {
                            degree: note.degrees.map(degreeText).join(' '),
                            beat: `${beatOf(to)}`,
                        })
                        .toText(),
                );
                focusNote({ index: to, voice: at.voice });
            } else focusNote(step(at, direction));
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
            remove(at.index);
            say(
                $locales
                    .concretize((l) => l.ui.palette.music.removed, {
                        degree: note.degrees.map(degreeText).join(' ') || '—',
                        beat: `${beatOf(at.index)}`,
                        count: track.data.notes.length - 1,
                    })
                    .toText(),
            );
            // The note that followed has taken this place; if there wasn't one,
            // the effect's clamp lands on the note before instead.
            focusNote({ index: at.index, voice: 0 });
        } else if (event.key === 'Enter') {
            // Repeat this note's pitch after it, which is a starting point to
            // move rather than an arbitrary one to find.
            const degree = note.degrees[at.voice] ?? note.degrees[0] ?? 1;
            add(at.index + 1, degree);
            say(
                $locales
                    .concretize((l) => l.ui.palette.music.added, {
                        degree: degreeText(degree),
                        beat: `${beatOf(at.index + 1)}`,
                        count: track.data.notes.length + 1,
                    })
                    .toText(),
            );
            focusNote({ index: at.index + 1, voice: 0 });
        } else return;

        event.preventDefault();
        // Enclosing views bind arrows to their own navigation, so moving within
        // this group must not also drive them.
        event.stopPropagation();
    }

    /**
     * Start dragging a note. The end listener is registered here, synchronously
     * on pointerdown, rather than from an effect: a quick press-release would
     * otherwise fire pointerup before the listener existed and leave the drag
     * stuck on. It lives on window so it survives the rebuild every revise
     * causes, and removes itself once fired.
     */
    function startDrag(event: PointerEvent, at: At) {
        if (!editable) return;
        if (track.data.notes[at.index] === undefined) return;
        event.stopPropagation();
        dragging = {
            index: at.index,
            voice: at.voice,
            whole: event.shiftKey,
            startX: event.clientX,
            startY: event.clientY,
            startStep: pointAt(event).step,
            steps: 0,
            places: 0,
            moved: false,
            committed: false,
        };
        window.addEventListener('pointermove', handleDrag);
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);
    }

    function endDrag() {
        dragging = undefined;
        selection?.setAdjusting(false);
        window.removeEventListener('pointermove', handleDrag);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
    }

    function handleDrag(event: PointerEvent) {
        const drag = dragging;
        if (drag === undefined) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;

        // A press only becomes a drag once it has travelled far enough; without
        // this the jitter in an ordinary click revises the program.
        if (!drag.moved && !exceedsMoveThreshold(dx, dy, event.pointerType))
            return;
        if (!drag.moved) {
            drag.moved = true;
            // Defer conflict analysis until the gesture ends, the way the
            // palette's sliders and the stage's handles both do.
            selection?.setAdjusting(true);
        }

        // Vertically: the degree nearest where the pointer now is. A drag
        // begun with shift moves the whole chord, matching shift's meaning on
        // the keyboard.
        const wantSteps = pointAt(event).step - drag.startStep;
        if (wantSteps !== drag.steps) {
            move(
                drag.index,
                wantSteps - drag.steps,
                drag.whole ? undefined : drag.voice,
                !drag.committed,
            );
            drag.committed = true;
            drag.steps = wantSteps;
        }

        // Horizontally: one place per beat travelled, since that is the width a
        // note occupies on the staff.
        const wantPlaces = Math.round(dx / PerBeat);
        while (drag.places !== wantPlaces) {
            const direction = wantPlaces > drag.places ? 1 : -1;
            const to = drag.index + direction;
            if (to < 0 || to >= track.data.notes.length) break;
            reorder(drag.index, direction, !drag.committed);
            drag.committed = true;
            drag.index = to;
            drag.places += direction;
            focusNote({ index: to, voice: drag.voice });
        }
    }

    /**
     * Follow the playhead while it moves.
     *
     * Without this a whole-music preview looks frozen: the head starts at the
     * music's beat 0 while the staff is scrolled to this track's first note,
     * which for an instrument entering late is hundreds of beats away — so it
     * advances entirely off-screen. Only scrolls when the head has actually
     * left the view, so a head crossing the middle of the staff doesn't drag
     * the view with it on every frame.
     */
    $effect(() => {
        if (playhead === undefined || region === undefined) return;
        const at = playhead * PerBeat;
        const left = region.scrollLeft;
        const width = region.clientWidth;
        if (at >= left + PerBeat && at <= left + width - PerBeat) return;
        // Put it a third in, so what comes next is visible rather than the
        // head sitting against an edge.
        region.scrollLeft = Math.max(0, at - width / 3);
        scrolled = region.scrollLeft;
    });

    /**
     * How close to an edge a scrub has to get before the staff follows it, and
     * how fast it follows at its fastest, in pixels a frame.
     *
     * Without this a drag stops at the edge of the window, which on an imported
     * song means the cursor can only ever be put somewhere already on screen.
     */
    const ScrollEdge = 32;
    const ScrollRate = 14;

    /** A scrub in progress, and the pointer x it last saw. */
    let scrubbing = $state(false);
    let scrubX = 0;
    let scrollFrame: number | undefined = undefined;

    /** Move the cursor to the beat at a viewport x, within the music. */
    function scrubTo(clientX: number) {
        if (!editable || region === undefined) return;
        const box = region.getBoundingClientRect();
        const beat = beatAtX(
            clientX - box.left - ClefInset + region.scrollLeft,
            PerBeat,
        );
        // Bounded by the music: there is nothing to start playing from after
        // the last note, so dragging past the end stops at it.
        onCursor?.(Math.max(0, Math.min(beats, beat)));
    }

    /**
     * Begin scrubbing, from the cursor itself or from the strip above the staff.
     *
     * Window listeners rather than pointer capture, because the drag has to
     * keep working past the edge of whichever element it began on — including
     * past the edge of the staff, where it scrolls.
     */
    function startScrub(event: PointerEvent) {
        if (!editable) return;
        event.preventDefault();
        // The staff places a note where it is clicked; this is not that.
        event.stopPropagation();
        scrubbing = true;
        scrubX = event.clientX;
        scrubTo(event.clientX);
        window.addEventListener('pointermove', handleScrub);
        window.addEventListener('pointerup', endScrub);
        window.addEventListener('pointercancel', endScrub);
        followEdge();
    }

    function handleScrub(event: PointerEvent) {
        scrubX = event.clientX;
        scrubTo(event.clientX);
    }

    function endScrub() {
        scrubbing = false;
        if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame);
        scrollFrame = undefined;
        window.removeEventListener('pointermove', handleScrub);
        window.removeEventListener('pointerup', endScrub);
        window.removeEventListener('pointercancel', endScrub);
    }

    /**
     * While scrubbing near an edge, scroll the staff under the pointer.
     *
     * On its own frame rather than on pointermove, because a pointer held
     * still at the edge sends no more moves — and holding still at the edge is
     * exactly how someone asks to keep going.
     */
    function followEdge() {
        scrollFrame = requestAnimationFrame(() => {
            if (!scrubbing || region === undefined) return;
            const box = region.getBoundingClientRect();
            const past =
                scrubX < box.left + ScrollEdge
                    ? scrubX - (box.left + ScrollEdge)
                    : scrubX > box.right - ScrollEdge
                      ? scrubX - (box.right - ScrollEdge)
                      : 0;
            if (past !== 0) {
                const by =
                    Math.sign(past) *
                    Math.min(ScrollRate, Math.max(2, Math.abs(past) / 2));
                // Only as far as there is staff to show. Without the
                // ceiling a drag held at the edge kept scrolling into empty
                // space past the end of the music.
                const furthest = Math.max(
                    0,
                    region.scrollWidth - region.clientWidth,
                );
                const to = Math.min(
                    furthest,
                    Math.max(0, region.scrollLeft + by),
                );
                if (to !== region.scrollLeft) {
                    region.scrollLeft = to;
                    scrolled = to;
                    // The staff moved beneath a pointer that didn't, so the
                    // beat under it changed.
                    scrubTo(scrubX);
                }
            }
            followEdge();
        });
    }

    /** Add a note where the staff was clicked. */
    function handleClick(event: MouseEvent) {
        if (!editable) return;
        const { beat, step: pitch } = pointAt(event);
        const index = indexAtBeat(track.data, beat);
        const degree = degreeForStep(pitch, track.data.scale, track.data.key);
        add(index, degree);
        say(
            $locales
                .concretize((l) => l.ui.palette.music.added, {
                    degree: degreeText(degree),
                    beat: `${Math.floor(beat)}`,
                    count: track.data.notes.length + 1,
                })
                .toText(),
        );
        focusNote({ index, voice: 0 });
    }
</script>

<div
    class="staff"
    bind:this={region}
    onscroll={() => {
        scrolled = region?.scrollLeft ?? 0;
        visible = region?.clientWidth ?? 0;
    }}
    style:height="{Height}px"
    style:--note="{NoteSize}px"
    style:--clef-inset="{ClefInset}px"
    style:--per-beat="{PerBeat}px"
>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- The staff places notes by click; that action is also available from the
         keyboard with Enter on any note, which are real buttons below, so the
         staff itself needs no key handler of its own. -->
    <div
        class="paper"
        style:width="{width}px"
        onclick={handleClick}
        role="presentation"
    >
        {#each staffLines(center) as line (line)}
            <div class="line" style:top="{heightOf(line)}%"></div>
        {/each}
        <div class="clef" aria-hidden="true">{TrebleClef}</div>
        <!-- One cursor, not two: where playing has reached while it plays, and where
         it will start from when it isn't. Two lines meant a creator had to
         work out which was which, and the still one stopped meaning anything
         once the moving one had passed it. Decorative — the note that defines
         it is itself focusable and announces its own beat. -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- Draggable: the line is the thing a creator sees and reaches for, so
             it is the thing that moves. Not focusable, and still hidden from
             screen readers, because the keyboard sets the cursor by focusing a
             note, which announces its own beat — this only gives the pointer
             the obvious grip it was missing. -->
        <div
            class="cursor"
            class:playing={playhead !== undefined}
            class:scrubbing
            aria-hidden="true"
            title={$locales.getPrimaryPlainText(
                (l) => l.ui.palette.music.cursor,
            )}
            style:left="calc({playhead ?? cursor} * var(--per-beat))"
            onpointerdown={startScrub}
            onclick={(event) => event.stopPropagation()}
        ></div>
        {#each marks as mark (keyOf(mark))}
            {@const at = atOf(mark)}
            <button
                type="button"
                animate:flip={{ duration: 200 * $animationFactor }}
                class="mark"
                class:rest={mark.rest}
                class:chord={voicesIn(at.index) > 1}
                data-note={slot(at)}
                tabindex={at.index === focused.index &&
                at.voice === focused.voice
                    ? 0
                    : -1}
                aria-label={describe(at.index).toText()}
                style:left="calc({mark.beat} * var(--per-beat))"
                style:top="{heightOf(mark.step)}%"
                style:--level={mark.level}
                onfocus={() => {
                    focused = at;
                    owned = true;
                    onFocus?.(at);
                }}
                onblur={(event) => {
                    // Losing focus to nothing means this notehead was replaced
                    // by an edit, and the claim should survive it; losing it to
                    // a real element means the creator moved on.
                    if (event.relatedTarget !== null) owned = false;
                }}
                onkeydown={(event) => handleKey(event, at)}
                onpointerdown={(event) => startDrag(event, at)}
                onclick={(event) => {
                    event.stopPropagation();
                    focusNote(at);
                }}
            >
                {#if mark.accidental}<span class="accidental"
                        >{mark.accidental}</span
                    >{/if}{mark.glyph}
            </button>
        {/each}
        <!-- The lyric, on its own line under the staff where a vocal score puts
             it, rather than travelling with its notehead — syllables that
             bounced with the melody would be unreadable. Decorative: the same
             text is readable and editable as a labelled field in the palette
             beside this, and each notehead announces its own beat. -->
        {#each marks as mark (`${keyOf(mark)} words`)}
            {#if mark.words !== undefined}
                <div
                    class="words"
                    aria-hidden="true"
                    style:left="calc({mark.beat} * var(--per-beat))"
                >
                    {mark.words}
                </div>
            {/if}
        {/each}
        {#if marks.length === 0}
            <!-- An empty track still needs somewhere to click. -->
            <div class="empty" aria-hidden="true">{glyphFor(1, true)}</div>
        {/if}
    </div>
</div>

<style>
    .staff {
        position: relative;
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-background);
    }

    .paper {
        position: relative;
        height: 100%;
        min-width: 100%;
        cursor: crosshair;
    }

    .line {
        position: absolute;
        inset-inline: 0;
        height: 1px;
        background: var(--wordplay-border-color);
    }

    .clef {
        position: absolute;
        inset-inline-start: 0;
        top: 50%;
        transform: translateY(-50%);
        font-size: calc(var(--note) * 2);
        opacity: 0.5;
        pointer-events: none;
    }

    .words {
        position: absolute;
        bottom: 0;
        margin-inline-start: var(--clef-inset);
        transform: translateX(-50%);
        font-size: calc(var(--note) * 0.45);
        line-height: 1;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0.75;
    }

    .mark {
        position: absolute;
        transform: translate(-50%, -50%);
        margin-inline-start: var(--clef-inset);
        border: none;
        background: none;
        padding: 0;
        color: inherit;
        font-size: var(--note);
        line-height: 1;
        cursor: grab;
        touch-action: none;
        /* The two noteheads of a mashed fractional note fade in proportion to
           how loudly each sounds, matching the stage rendering. */
        opacity: var(--level, 1);
    }

    .mark:active {
        cursor: grabbing;
    }

    .mark:focus {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
        border-radius: var(--wordplay-border-radius);
    }

    /* Multiplied rather than replaced, so a focused rest is still dimmed. */
    .mark.rest {
        opacity: calc(var(--level, 1) * 0.55);
    }

    /* A chord is several noteheads at one beat, which otherwise reads as
       unrelated notes that happen to line up. Drawn as an echo of the notehead
       rather than a filled box: a fill has to pick a lightness, and the one
       that reads on a light background disappears on a dark one. A shadow is
       an offset copy of the glyph itself, so it carries the contrast of the
       note it belongs to in either scheme — and an echo is what a chord is. */
    .mark.chord {
        text-shadow:
            0.07em 0.07em 0 var(--wordplay-inactive-color),
            0.14em 0.14em 0 var(--wordplay-alternating-color);
    }

    .cursor {
        position: absolute;
        inset-block: 0;
        margin-inline-start: var(--clef-inset);
        width: 2px;
        background: var(--wordplay-highlight-color);
        cursor: ew-resize;
        touch-action: none;
        z-index: 3;
    }

    /* Two pixels is not something anyone can aim at, so the grip reaches out
       either side of the line without drawing anything. */
    .cursor::before {
        content: '';
        position: absolute;
        inset-block: 0;
        inset-inline-start: -7px;
        width: 16px;
    }

    /* While playing, the line is a readout rather than a control: it is being
       driven by the music, so it shouldn't invite a grab or swallow a click
       meant for the staff. */
    .cursor.playing {
        pointer-events: none;
    }

    /* Brighter while it moves, so a glance says whether it's playing without
       having to notice whether it advanced. */
    .cursor.playing {
        width: 3px;
    }

    /* Wider while held, so the line reads as grabbed. */
    .cursor.scrubbing {
        width: 3px;
    }

    .accidental {
        font-size: 65%;
        vertical-align: super;
    }

    .empty {
        position: absolute;
        inset-inline-start: calc(var(--clef-inset) + var(--note) * 0.5);
        top: 50%;
        transform: translateY(-50%);
        font-size: var(--note);
        opacity: 0.35;
    }
</style>

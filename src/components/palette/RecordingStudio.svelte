<script lang="ts">
    /**
     * Hum a tune and have it written down.
     *
     * Writing music is hard even with @Music's simpler notation, and a person
     * who can hum a melody often can't yet say what its notes are. This listens
     * to the microphone, tracks the pitch, and appends what it heard to the
     * track being edited.
     *
     * The listening loop is the only part that lives here. Everything that
     * decides what a note *is* — where one begins, how long it lasts, what key
     * and scale the tune is in — is in `transcribe.ts`, pure and fed frames, so
     * those decisions can be tested against a written-down sequence instead of
     * only by humming at the app.
     *
     * The pitch detector and the microphone are both reused: `computePitch` is
     * the same McLeod analysis the `Pitch` stream uses, and `acquireAudioSource`
     * is the same ref-counted stream, so a program already listening doesn't
     * open a second one.
     */
    import Button from '@components/widgets/Button.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Note from '@components/widgets/Note.svelte';
    import { DB } from '@db/Database';
    import { acquireAudioSource } from '@input/AudioSource';
    import { computePitch, PITCH_FFT_SIZE } from '@input/AudioAnalysisMath';
    import transcribe, { type Frame } from '@output/Music/transcribe';
    import { glyphFor } from '@output/Music/sheet';
    import type { NoteData } from '@output/Music/musicData';
    import { PitchDetector } from 'pitchy';
    import { onDestroy } from 'svelte';

    interface Props {
        editable: boolean;
        /** Append what was heard to the track being edited. */
        append: (notes: readonly NoteData[]) => void;
    }

    let { editable, append }: Props = $props();

    /** How often the pitch is sampled, in milliseconds — the Pitch stream's
     * own default, fast enough to catch a short note and slow enough not to
     * spend the main thread on autocorrelation. */
    const RateMs = 50;

    /**
     * A ceiling on one take.
     *
     * A recording that runs forever is a recording nobody meant to start, and
     * the frames are held in memory until it stops.
     */
    const MaxMs = 60_000;

    /**
     * How often the notes heard so far are re-read, in milliseconds.
     *
     * Not every frame: `transcribe` re-fits the scale and re-measures the tempo
     * over the whole take, so this is real work, and five times a second is
     * already faster than anyone can sing a note.
     */
    const PreviewMs = 200;

    /** The most notes to show. A minute of humming is more than fits, and the
     * end is the part being sung. */
    const PreviewNotes = 24;

    let recording = $state(false);
    /** What has been heard so far, re-read as the take goes on. */
    let heard = $state<NoteData[]>([]);
    let lastPreviewAt = 0;
    let result = $state<{ count: number; scale: string; tempo: number } | null>(
        null,
    );
    let failed = $state(false);

    let handle: ReturnType<typeof acquireAudioSource> | undefined = undefined;
    let analyzer: AnalyserNode | undefined = undefined;
    let detector: ReturnType<typeof PitchDetector.forFloat32Array> | undefined =
        undefined;
    // Typed with its buffer, matching what `new Float32Array(n)` produces and
    // what pitchy's detector requires.
    let buffer: Float32Array<ArrayBuffer> | undefined = undefined;
    let timer: ReturnType<typeof setInterval> | undefined = undefined;
    let frames: Frame[] = [];
    let startedAt = 0;

    function start() {
        result = null;
        failed = false;
        frames = [];
        heard = [];
        lastPreviewAt = 0;
        recording = true;

        handle = acquireAudioSource(DB, () => {
            failed = true;
            stop(false);
        });
        // Deliberately not createPitchDetector(): a whole take is gated
        // relatively against its own loudest (MinLevel in transcribe), so an
        // absolute floor here would throw away a quiet recording entirely.
        detector = PitchDetector.forFloat32Array(PITCH_FFT_SIZE);
        buffer = new Float32Array(PITCH_FFT_SIZE);
        startedAt = performance.now();

        timer = setInterval(() => {
            const context = handle?.getContext();
            const source = handle?.getSourceNode();
            if (context === undefined || source === undefined) return;
            // Built on the first tick that has a stream, not at start: the
            // microphone is granted asynchronously, so there is nothing to
            // connect to until the creator has said yes.
            if (analyzer === undefined) {
                analyzer = context.createAnalyser();
                analyzer.fftSize = PITCH_FFT_SIZE;
                source.connect(analyzer);
            }
            if (detector === undefined || buffer === undefined) return;
            analyzer.getFloatTimeDomainData(buffer);
            const at = performance.now() - startedAt;
            // How loud this window was. The detector reports confident pitches
            // in breath and room noise — two octaves below the melody, at
            // clarities up to 0.977 on a real take — and loudness is what
            // separates those from singing. Clarity does not.
            let energy = 0;
            for (const sample of buffer) energy += sample * sample;
            frames.push({
                hz: computePitch(detector, context.sampleRate, buffer),
                at,
                level: Math.sqrt(energy / buffer.length),
            });
            // Read back what's been sung so far, so notes appear as they are
            // heard rather than all at once at the end.
            if (at - lastPreviewAt >= PreviewMs) {
                lastPreviewAt = at;
                heard = transcribe(frames)?.notes ?? [];
            }
            if (at >= MaxMs) stop(true);
        }, RateMs);
    }

    function stop(write: boolean) {
        recording = false;
        if (timer !== undefined) clearInterval(timer);
        timer = undefined;
        analyzer?.disconnect();
        analyzer = undefined;
        handle?.release();
        handle = undefined;
        detector = undefined;
        buffer = undefined;

        if (!write) {
            heard = [];
            return;
        }
        const transcription = transcribe(frames);
        frames = [];
        heard = [];
        if (transcription === undefined) {
            result = { count: 0, scale: '', tempo: 0 };
            return;
        }
        append(transcription.notes);
        result = {
            count: transcription.notes.filter(
                (note) => note.degrees.length > 0,
            ).length,
            scale: transcription.scale,
            tempo: transcription.tempo,
        };
    }

    // A take doesn't outlive the editor that started it, and neither does the
    // microphone: leaving it open would keep the browser's indicator lit.
    onDestroy(() => stop(false));
</script>

<div class="studio">
    <Button
        tip={(l) =>
            recording
                ? l.ui.palette.button.stopRecording
                : l.ui.palette.button.record}
        active={editable}
        action={() => (recording ? stop(true) : start())}
        icon={recording ? '⏹' : '🎤'}
        background
    ></Button>
</div>

{#if recording}
    <Note><MarkupHtmlView markup={(l) => l.ui.palette.music.listening} /></Note>
    <!-- Deliberately hidden from screen readers, and deliberately not a live
         region. The microphone is open: anything spoken while a take is running
         is sung into the take. The summary announced when recording stops is
         the accessible equivalent of what this shows. -->
    <div class="heard" aria-hidden="true">
        {#each heard.slice(-PreviewNotes) as note, index (index)}
            <span class="note" class:rest={note.degrees.length === 0}>
                {#if note.degrees.length > 0}{note.degrees[0]}{/if}{glyphFor(
                    note.beats,
                    note.degrees.length === 0,
                )}
            </span>
        {/each}
    </div>
{:else if failed}
    <Note
        ><MarkupHtmlView
            markup={(l) => l.ui.palette.music.noMicrophone}
        /></Note
    >
{:else if result !== null}
    <Note>
        {#if result.count === 0}
            <MarkupHtmlView markup={(l) => l.ui.palette.music.heardNothing} />
        {:else}
            <MarkupHtmlView
                markup={[
                    (l) => l.ui.palette.music.transcribed,
                    {
                        count: result.count,
                        scale: result.scale,
                        tempo: `${result.tempo}`,
                    },
                ]}
            />
        {/if}
    </Note>
{/if}

<style>
    .heard {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: baseline;
        gap: calc(var(--wordplay-spacing) / 2);
        min-height: 1.5em;
    }

    .note {
        font-size: var(--wordplay-small-font-size);
        white-space: nowrap;
    }

    .rest {
        color: var(--wordplay-inactive-color);
    }

    .studio {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>

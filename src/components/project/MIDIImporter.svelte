<script lang="ts">
    /**
     * Import a MIDI file as a new `Music` in the project.
     *
     * Rendered inside the add-source dialog, which is the one place in the app
     * that turns data into code (#559). It used to sit in the palette's insert
     * toolbar with a dialog of its own for its report; the host dialog is what
     * that dialog was for, so this now renders its progress and its findings
     * where it stands.
     *
     * The conversion itself already existed and is well tested — it takes bytes
     * and returns Wordplay source plus structured findings. What was missing
     * was any way to reach it: there is no file upload anywhere else in the
     * app, and the findings' English lived only in a CLI script. They were
     * built as data precisely so a dialog could render them localized, which is
     * what happens here.
     *
     * The findings are shown *after* the import rather than as a confirmation
     * step. Every one of them is about something already decided by the file —
     * a tempo change that can't be kept, a drum with no match — so there is
     * nothing for a creator to choose, only something to know.
     */
    import ProgressBar from '@components/widgets/ProgressBar.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Note from '@components/widgets/Note.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import freshSourceName from '@edit/freshSourceName';
    import { MUSIC_SYMBOL } from '@parser/Symbols';

    /**
     * The arrow on the import button. Deliberately not `BORROW_SYMBOL` (`↓`),
     * which the import writes into the program as a `↓ borrow` line: from the
     * creator's side this is a file going up out of their computer, and a down
     * arrow on a file picker reads as a download.
     */
    const UPLOAD_GLYPH = '↑';
    import readMusic, { musicsIn } from '@edit/output/editableMusic';
    import type { LocaleTextsAccessor } from '@locale/Locales';
    import type { TemplateInput } from '@locale/Locales';
    import importMIDI, {
        isFormatError,
        looksLikeMIDI,
    } from '@output/Music/midi/importMIDI';
    import type { Finding } from '@output/Music/midi/convert';
    import { must } from '@util/nullable';

    interface Props {
        project: Project;
        editable: boolean;
        /** Put the revised project into the world, tile and all. */
        added: (project: Project) => void;
    }

    let { project, editable, added }: Props = $props();

    let picker: HTMLInputElement | undefined = $state(undefined);
    /** What the last import reported, or an error, or nothing yet. */
    let report = $state<{
        findings: Finding[];
        tracks: number;
        notes: number;
    } | null>(null);
    let problem = $state<'notMIDI' | 'badMIDI' | null>(null);
    /**
     * Which phase the import is in, or undefined when idle.
     *
     * Reported between phases rather than continuously: every step is a
     * synchronous call that can't be interrupted to report from inside, so the
     * honest thing is to name the step about to run and yield so it paints.
     * Four steps, and the last is by far the longest — the percentages are
     * weighted to say so rather than pretending they're even.
     */
    let step = $state<number | undefined>(undefined);
    // Weighted by measurement rather than evenly: on a 5,000-note song the
    // parse is ~5s of a ~6.5s import and the analysis ~1.2s, so even quarters
    // would claim three-quarters done and then sit still for five seconds.
    const StepPercents = [2, 5, 8, 15, 85];
    let importing = $derived(step !== undefined);
    /** Set when a file holds more notes than a project can carry. */
    let tooBig = $state<{ notes: number } | null>(null);

    /**
     * A ceiling on what we'll read.
     *
     * A MIDI file is tiny for what it describes, so anything past this is not a
     * song — and the converter is synchronous, so a huge one would lock the
     * page rather than fail.
     */
    const MaxBytes = 2 * 1024 * 1024;

    /**
     * The most notes an imported music may carry.
     *
     * Anchored to evidence: the largest music that ships with Wordplay is
     * Lyrics, a 41-track MIDI conversion of 8,550 notes and 198KB of source,
     * and that one opens. Ten thousand is a little past it, and the database
     * rejects a project over 1MB anyway — roughly 50,000 notes — but only
     * after doing all the work, and silently.
     */
    const MaxNotes = 10_000;

    async function choose() {
        const file = picker?.files?.[0];
        if (file === undefined) return;
        report = null;
        problem = null;
        tooBig = null;
        try {
            await read(file);
        } finally {
            step = undefined;
            // Let the same file be chosen again, after a failure or a success.
            if (picker) picker.value = '';
        }
    }

    /** Show a step and let it paint before the work it names begins. */
    async function begin(which: number) {
        step = which;
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    async function read(file: File) {
        await begin(0);
        if (file.size > MaxBytes) {
            problem = 'badMIDI';
            return;
        }

        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!looksLikeMIDI(bytes)) {
            problem = 'notMIDI';
            return;
        }

        await begin(1);
        let conversion;
        try {
            conversion = importMIDI(bytes, {
                name: file.name.replace(/\.midi?$/i, ''),
            });
        } catch (error) {
            // A malformed file and an unreadable one land in the same place:
            // there is nothing a creator can do differently about either.
            void isFormatError(error);
            problem = 'badMIDI';
            return;
        }

        if (conversion.noteCount > MaxNotes) {
            tooBig = { notes: conversion.noteCount };
            return;
        }

        // Appended as TEXT rather than parsed and spliced as nodes.
        //
        // Splicing is quadratic: replacing a node rebuilds the source's
        // spacing, and the cost grows with the square of the notes — 800 notes
        // took 5 seconds, 1,600 took 20, 3,200 took 79. That was the hang, not
        // the editor and not the conversion, which handles 16,000 notes in six
        // milliseconds. Appending text is linear and 300x faster at 3,200
        // notes, and it keeps the converter's own line layout, which the
        // editor virtualizes by line.
        await begin(2);
        const sourceName = freshSourceName(project, conversion.sourceName);

        await begin(3);

        // The notes go in their own source and the program borrows them. A
        // supplement's tile starts collapsed and an unmounted tile renders
        // nothing, so the notes cost no layout until someone opens them — and
        // the program stays two lines, which is what makes editing it fast.
        const grown = project.withNewSource(
            sourceName,
            `${conversion.tracks}\n`,
        );
        const main = grown.getMain();
        const before = main.code.toString();
        // The borrow goes at the top, because a program's borrows are parsed
        // before anything else; the music goes at the end with whatever else
        // the program already produces.
        const [borrow, ...music] = conversion.main
            .replaceAll(conversion.sourceName, sourceName)
            .split('\n');
        const revised = grown.withSource(
            main,
            main.withCode(
                `${borrow}\n${before}${before.endsWith('\n') ? '' : '\n'}${music.join('\n')}`,
            ),
        );

        // Analyzed here rather than left to fire reactively once the dialog has
        // closed: it is over a second on a long song, and unexplained silence
        // after a dialog says "done" reads as a second freeze. Doing it now
        // also means the reactive pass finds it cached.
        await begin(4);
        revised.analyze();

        // Put the caret in the first imported track, so the palette opens on
        // what just arrived rather than leaving the creator to find it. The
        // imported music is the last one, since it was appended.
        const musics = musicsIn(revised);
        // The imported music was just appended, so there is a last one.
        const track = readMusic(
            revised,
            must(musics[musics.length - 1], 'the imported music'),
        )?.tracks[0]?.evaluate;
        added(
            track === undefined
                ? revised
                : revised.withCaret(revised.getMain(), track),
        );

        report = {
            findings: conversion.findings,
            tracks: conversion.trackCount,
            notes: conversion.noteCount,
        };
    }

    type Sentence = {
        text: [LocaleTextsAccessor, Record<string, TemplateInput>];
        lossy: boolean;
    };

    /** A finding's sentence, with the numbers the converter measured. */
    function describe(finding: Finding): Sentence | undefined {
        const { kind, count, detail } = finding;
        const say = (
            path: LocaleTextsAccessor,
            inputs: Record<string, TemplateInput>,
            lossy: boolean,
        ): Sentence => ({ text: [path, inputs], lossy });

        switch (kind) {
            case 'tracks-split':
                // Splitting a polyphonic track into voices keeps every note.
                return say(
                    (l) => l.ui.palette.music.findings.tracksSplit,
                    { count, extra: `${detail?.extraTracks ?? 0}` },
                    false,
                );
            case 'notes-dropped-percussion':
                return say(
                    (l) => l.ui.palette.music.findings.percussionDropped,
                    { count },
                    true,
                );
            case 'tracks-truncated':
                return say(
                    (l) => l.ui.palette.music.findings.tracksTruncated,
                    { count, cap: `${detail?.cap ?? 0}` },
                    true,
                );
            case 'pitches-snapped':
                // Nothing moved is not a finding worth a sentence.
                return count === 0
                    ? undefined
                    : say(
                          (l) => l.ui.palette.music.findings.pitchesSnapped,
                          {
                              count,
                              scale: `${detail?.scale ?? ''}`,
                              semitones: `${detail?.maxSemitones ?? 0}`,
                          },
                          true,
                      );
            case 'beats-rounded':
                // A thousandth of a beat is not a rhythm anyone can hear.
                return say(
                    (l) => l.ui.palette.music.findings.beatsRounded,
                    { count, error: `${detail?.maxError ?? 0}` },
                    false,
                );
            case 'tempo-folded':
                // The piece still speeds up and slows down; what's lost is the
                // beat's meaning, not the sound.
                return say(
                    (l) => l.ui.palette.music.findings.tempoFolded,
                    { count, using: `${detail?.using ?? 0}` },
                    false,
                );
            case 'time-signature-changes':
                return say(
                    (l) => l.ui.palette.music.findings.meterChanges,
                    { count },
                    true,
                );
            case 'velocity-range':
                // Each note keeps its own volume; only the ramps are lost.
                return say(
                    (l) => l.ui.palette.music.findings.velocityRange,
                    { count, track: `${detail?.track ?? 0}` },
                    false,
                );
            case 'pitches-out-of-range':
                return say(
                    (l) => l.ui.palette.music.findings.outOfRange,
                    { count },
                    true,
                );
            default:
                return undefined;
        }
    }

    let sentences = $derived(
        (report?.findings ?? [])
            .map(describe)
            .filter((sentence): sentence is Sentence => sentence !== undefined),
    );
</script>

<div class="importer panel-column">
    <Button
        background
        tip={(l) => l.ui.palette.button.importMIDI}
        active={editable && !importing}
        action={() => picker?.click()}
        icon={`${UPLOAD_GLYPH}${MUSIC_SYMBOL}`}
        label={(l) => l.ui.palette.music.choose}
    ></Button>
    <!-- The real input is hidden because a bare file input can't be styled to
         match the rest of the dialog; the button above is its label and does the
         work. The uiid is how a test reaches it. -->
    <input
        type="file"
        accept=".mid,.midi,audio/midi"
        data-uiid="midiPicker"
        bind:this={picker}
        onchange={choose}
        aria-label={$locales.getPrimaryPlainText(
            (l) => l.ui.palette.button.importMIDI,
        )}
    />

    {#if problem !== null}
        <Note
            ><LocalizedText
                path={(l) =>
                    problem === 'notMIDI'
                        ? l.ui.palette.music.notMIDI
                        : l.ui.palette.music.badMIDI}
            /></Note
        >
    {:else if tooBig !== null}
        <Note
            ><MarkupHtmlView
                inline
                markup={[
                    (l) => l.ui.palette.music.tooBig,
                    { count: tooBig.notes, cap: `${MaxNotes}` },
                ]}
            /></Note
        >
    {/if}

    <!-- Shown while the import runs, not only when it finishes: the work blocks
         the page for seconds on a long song, and silence reads as a frozen page
         rather than as something happening. -->
    {#if step !== undefined}
        <div class="stack progress">
            <MarkupHtmlView
                inline
                markup={[
                    (l) => l.ui.palette.music.importing,
                    {
                        percent: `${StepPercents[step] ?? 0}`,
                        // One label per import step.
                        step: $locales.getPrimaryPlainText((l) =>
                            must(
                                l.ui.palette.music.steps.labels[step ?? 0],
                                'an import step label',
                            ),
                        ),
                    },
                ]}
            />
            <ProgressBar
                percent={StepPercents[step] ?? 0}
                sweep
                label={(l) => l.ui.palette.music.steps.label}
            />
        </div>
    {:else if report !== null}
        <Subheader text={(l) => l.ui.palette.music.report} />
        <MarkupHtmlView markup={(l) => l.ui.palette.music.reportExplanation} />
        <MarkupHtmlView
            markup={[
                (l) => l.ui.palette.music.imported,
                { count: report.tracks, notes: `${report.notes}` },
            ]}
        />
        {#each sentences as sentence, index (index)}
            <div class="finding" class:lossy={sentence.lossy}>
                <MarkupHtmlView markup={sentence.text} />
            </div>
        {/each}
    {/if}
</div>

<style>
    .importer {
        align-items: start;
    }

    /* Off-screen rather than display:none, so it stays focusable for anyone
       driving the page with a screen reader that reaches inputs directly. */
    input[type='file'] {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
    }
    .finding {
        margin-block-start: var(--wordplay-spacing);
        padding-inline-start: var(--wordplay-spacing);
        border-inline-start: var(--wordplay-focus-width) solid
            var(--wordplay-inactive-color);
    }

    /* The same mark an annotation uses for a minor conflict, so a loss here
       reads as the same kind of thing. A border rather than text colour: the
       warning hue is a background/border colour and fails contrast as text. */
    .finding.lossy {
        border-inline-start-color: var(--wordplay-warning);
    }
</style>

<script lang="ts">
    /**
     * Import a MIDI file as a new `Music` in the project.
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
    import { Projects } from '@db/projects/Projects';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import Note from '@components/widgets/Note.svelte';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import Bind from '@nodes/Bind';
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

    interface Props {
        project: Project;
        editable: boolean;
    }

    let { project, editable }: Props = $props();

    let picker: HTMLInputElement | undefined = $state(undefined);
    /** What the last import reported, or an error, or nothing yet. */
    let report = $state<{
        findings: Finding[];
        tracks: number;
        notes: number;
    } | null>(null);
    let problem = $state<'notMIDI' | 'badMIDI' | null>(null);
    /** Whether the report dialog is open. */
    let reporting = $state(false);
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
        reporting = true;
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
        const names = freshNames(conversion, project);

        await begin(3);

        // The notes go in their own source and the program borrows them. A
        // supplement's tile starts collapsed and an unmounted tile renders
        // nothing, so the notes cost no layout until someone opens them — and
        // the program stays two lines, which is what makes editing it fast.
        const added = project.withNewSource(
            names.sourceName,
            `${conversion.tracks}\n`,
        );
        const main = added.getMain();
        const before = main.code.toString();
        // The borrow goes at the top, because a program's borrows are parsed
        // before anything else; the music goes at the end with whatever else
        // the program already produces.
        const [borrow, ...music] = conversion.main
            .replaceAll(conversion.sourceName, names.sourceName)
            .split('\n');
        const revised = added.withSource(
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
        const track = readMusic(revised, musics[musics.length - 1])?.tracks[0]
            ?.evaluate;
        Projects.reviseProject(
            track === undefined
                ? revised
                : revised.withCaret(revised.getMain(), track),
        );

        report = {
            findings: conversion.findings,
            tracks: conversion.trackCount,
            notes: conversion.noteCount,
        };
        reporting = true;
    }

    /**
     * A name for the imported source that nothing else is using.
     *
     * Source names and bind names share one space here: `Project.getShare`
     * matches a **source** name before it looks at shares, so an imported
     * source called `song` would shadow a bind of that name. Numbered onward
     * from whatever is taken, so importing twice gives `song` then `song2`.
     */
    function freshNames(
        conversion: { sourceName: string },
        project: Project,
    ): { sourceName: string } {
        const taken = new Set<string>();
        for (const each of project.getSources()) {
            for (const name of each.names.getNames()) taken.add(name);
            for (const node of each.nodes())
                if (node instanceof Bind)
                    for (const name of node.names.getNames()) taken.add(name);
        }
        const free = (wanted: string) => {
            if (!taken.has(wanted)) return wanted;
            let n = 2;
            while (taken.has(`${wanted}${n}`)) n++;
            return `${wanted}${n}`;
        };
        return { sourceName: free(conversion.sourceName) };
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

<div class="importer">
    <Button
        tip={(l) => l.ui.palette.button.importMIDI}
        active={editable && !importing}
        action={() => picker?.click()}
        icon={`${UPLOAD_GLYPH}${MUSIC_SYMBOL}`}
    ></Button>
    <!-- The real input is hidden because a bare file input can't be styled to
         match the toolbar; the button above is its label and does the work. -->
    <input
        type="file"
        accept=".mid,.midi,audio/midi"
        bind:this={picker}
        onchange={choose}
        aria-label={$locales.getPrimaryPlainText(
            (l) => l.ui.palette.button.importMIDI,
        )}
    />
</div>

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

<!-- Opened when the import starts, not when it finishes: the work blocks the
     page for seconds on a long song, and a progress line tucked into the offers
     panel read as a frozen page rather than as something happening. -->
<Dialog
    bind:show={reporting}
    header={(l) => l.ui.palette.music.report}
    explanation={(l) => l.ui.palette.music.reportExplanation}
>
    {#if step !== undefined}
        <div class="progress">
            <MarkupHtmlView
                inline
                markup={[
                    (l) => l.ui.palette.music.importing,
                    {
                        percent: `${StepPercents[step] ?? 0}`,
                        step: $locales.getPrimaryPlainText(
                            (l) => l.ui.palette.music.steps.labels[step ?? 0],
                        ),
                    },
                ]}
            />
            <!-- Two bars: what is done, and a sweep over it. The sweep animates
                 `transform`, which the compositor runs — so it keeps moving
                 while the parse holds the main thread, which is the whole point.
                 A percentage alone stops updating and reads as a hung page. -->
            <div
                class="track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={StepPercents[step] ?? 0}
                aria-label={$locales.getPrimaryPlainText(
                    (l) => l.ui.palette.music.steps.label,
                )}
            >
                <div class="done" style:width="{StepPercents[step] ?? 0}%"
                ></div>
                <div class="sweep"></div>
            </div>
        </div>
    {:else if report !== null}
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
</Dialog>

<style>
    /* A column so the button sits in the offer's row of actions while whatever
       the import has to report stacks beneath it. */
    .importer {
        display: flex;
        flex-direction: column;
        align-items: end;
        gap: var(--wordplay-spacing);
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

    .progress {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .track {
        position: relative;
        overflow: hidden;
        width: 100%;
        height: var(--wordplay-focus-width);
        background: var(--wordplay-alternating-color);
        border-radius: var(--wordplay-border-radius);
    }

    .done {
        height: 100%;
        background: var(--wordplay-highlight-color);
    }

    .sweep {
        position: absolute;
        inset-block: 0;
        inset-inline-start: 0;
        width: 30%;
        background: var(--wordplay-highlight-color);
        opacity: 0.5;
        animation: sweep calc(var(--animation-factor) * 1.2s) linear infinite;
    }

    @keyframes sweep {
        from {
            transform: translateX(-100%);
        }
        to {
            transform: translateX(400%);
        }
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

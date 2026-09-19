<script lang="ts">
    /**
     * Saving a value as a file.
     *
     * **This is the only component that serializes a value**, and that is the
     * whole performance story: `canExport` is an O(1) class test that render
     * paths and the editor's menu may call, while the walk that reshapes a
     * value into rows or JSON happens here, once, when the dialog opens. The
     * two can disagree — a list whose hundredth item is a function passes the
     * cheap test — and this says so rather than exporting something wrong.
     *
     * The preview is the point as much as the file is: a creator who has never
     * seen a CSV can see what one is before deciding to save it. Copy sits
     * beside Save because pasting the text back into the editor rebuilds the
     * table, which is the loop this feature exists to close.
     */
    import { toClipboard } from '@components/editor/commands/Clipboard';
    import { getAnnouncer } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { CONFIRM_SYMBOL } from '@parser/Symbols';
    import downloadBytes from '@util/download';
    import {
        bytesOf,
        extensionOf,
        fileNameFor,
        formatsFor,
        mimeTypeOf,
        serialize,
        type ExportFormat,
    } from '@values/export/exportValue';
    import type Value from '@values/Value';

    interface Props {
        /** The value to save, or undefined when nothing has asked to save one. */
        value: Value | undefined;
        project: Project;
        show?: boolean;
        /** Called when the dialog closes, so a host driving it from a request
         *  slot can clear the request. */
        onclose?: () => void;
    }

    let { value, project, show = $bindable(false), onclose }: Props = $props();

    /** Report a close exactly once, and never the `false` it starts at. */
    let wasShown = false;
    $effect(() => {
        if (show) wasShown = true;
        else if (wasShown) {
            wasShown = false;
            onclose?.();
        }
    });

    /** Every format this dialog can offer, in the order `Mode` draws them. */
    const AllFormats: ExportFormat[] = ['csv', 'json'];

    /** The walk, done once per value rather than once per render. */
    let available = $derived(
        value === undefined ? [] : formatsFor(value, $locales),
    );

    let chosen: ExportFormat = $state('csv');

    /** Fall back to whatever this value does support, so opening the dialog on
     *  a value with no grid doesn't show an empty preview. */
    let format = $derived(
        available.includes(chosen) ? chosen : (available[0] ?? 'csv'),
    );

    let exported = $derived(
        value === undefined ? undefined : serialize(value, format, $locales),
    );

    /** The creator's edit, or undefined while they haven't made one. Reset when
     *  the value or the format changes so the extension keeps up. */
    let editedName: string | undefined = $state(undefined);
    let suggestedName = $derived(
        value === undefined
            ? ''
            : fileNameFor(project.getName(), value, format, $locales),
    );
    let name = $derived(editedName ?? suggestedName);

    let copied = $state(false);

    /** How many rows the file has, and how much of it the preview shows. A big
     *  table would otherwise put a megabyte of text in the DOM. */
    const PreviewLines = 40;
    let lines = $derived(
        exported === undefined ? [] : exported.text.split('\n'),
    );
    let truncated = $derived(lines.length > PreviewLines);
    let preview = $derived(
        truncated
            ? lines.slice(0, PreviewLines).join('\n')
            : (exported?.text ?? ''),
    );

    let countInputs = $derived({ count: lines.length });

    const announce = getAnnouncer();

    function save() {
        if (exported === undefined) return;
        downloadBytes(bytesOf(exported), name, mimeTypeOf(exported.format));
        // Names the file, so two saves in a row differ and the second is heard.
        if (announce && $announce)
            $announce(
                'export',
                $locales.getLanguages()[0],
                $locales
                    .concretize((l) => l.ui.export.downloaded, { name })
                    .toText(),
            );
    }

    async function copy() {
        if (exported === undefined) return;
        copied = false;
        // The text, never `bytesOf`: a byte order mark pasted back into the
        // editor would land inside the first header cell.
        await toClipboard(exported.text);
        setTimeout(() => (copied = true), 100);
        if (announce && $announce)
            $announce(
                'export',
                $locales.getLanguages()[0],
                $locales
                    .concretize((l) => l.ui.export.copied, {
                        format: extensionOf(exported.format).toUpperCase(),
                    })
                    .toText(),
            );
    }
</script>

<Dialog
    bind:show
    header={(l) => l.ui.export.header}
    explanation={(l) => l.ui.export.explanation}
    closeable
>
    {#if value === undefined || available.length === 0}
        <Note><LocalizedText path={(l) => l.ui.export.unavailable} /></Note>
    {:else}
        <Mode
            modes={(l) => l.ui.export.formats}
            choice={AllFormats.indexOf(format)}
            select={(choice) => {
                const picked = AllFormats[choice];
                if (picked !== undefined) {
                    chosen = picked;
                    editedName = undefined;
                }
            }}
            omit={AllFormats.map((f, index) =>
                available.includes(f) ? undefined : index,
            ).filter((index): index is number => index !== undefined)}
            labeled
            modeLabels
        />

        <!-- No aria-label: the text IS the content, and labelling the element
             would replace what a reader navigates through with one long string. -->
        <pre class="preview">{preview}</pre>
        {#if truncated}
            <Note
                ><MarkupHTMLView
                    inline
                    markup={[(l) => l.ui.export.truncated, countInputs]}
                /></Note
            >
        {/if}
        {#if exported?.notes?.droppedUnits}
            <Note><LocalizedText path={(l) => l.ui.export.droppedUnits} /></Note
            >
        {/if}
        {#if exported?.notes?.unrepresentableNumbers}
            <Note
                ><LocalizedText
                    path={(l) => l.ui.export.droppedNumbers}
                /></Note
            >
        {/if}

        <div class="actions">
            <TextField
                id="export-file-name"
                text={name}
                description={(l) => l.ui.export.filename}
                placeholder={(l) => l.ui.export.filename}
                changed={(text) => (editedName = text)}
            />
            <Button
                background="salient"
                tip={(l) => l.ui.export.download}
                action={save}
            >
                <LocalizedText path={(l) => l.ui.export.download} /></Button
            >
            <Button background tip={(l) => l.ui.export.copy} action={copy}>
                <LocalizedText path={(l) => l.ui.export.copy} />
                {#if copied}{CONFIRM_SYMBOL}{/if}</Button
            >
        </div>
    {/if}
</Dialog>

<style>
    .preview {
        /* The file's own shape is the information, so it must not be reflowed
           or rendered in the interface font. */
        font-family: var(--wordplay-code-font);
        font-size: var(--wordplay-small-font-size);
        /* The panel background, not `--wordplay-inactive-color`: that token is
           `--color-grey-text`, a TEXT color, and using it behind text put this
           at 3.94:1 in light and 3.28:1 in dark. `--wordplay-alternating-color`
           is the surface the AA text variants are guaranteed against. */
        background: var(--wordplay-alternating-color);
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        max-block-size: 40vh;
        overflow: auto;
        /* Horizontal, always: a CSV row is a line, and wrapping it would show a
           shape the file does not have. */
        writing-mode: horizontal-tb;
        white-space: pre;
    }

    .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
        margin-block-start: var(--wordplay-spacing);
    }
</style>

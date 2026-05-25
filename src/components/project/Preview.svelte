<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import GlyphChooser from '@components/widgets/GlyphChooser.svelte';
    import Switch from '@components/widgets/Switch.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { Projects } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type { SerializedPreview } from '@db/projects/ProjectSchemas';
    import UnicodeString from '@unicode/UnicodeString';

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    // The text field starts empty and never auto-populates from the
    // currently-pinned glyph — typing here is the act of pinning a NEW
    // glyph, so prefilling would be confusing. The GlyphChooser below is
    // for picking one without typing.
    let customDraft = $state<string>('');

    let mode = $derived<'auto' | 'custom'>(
        project.getPreview()?.mode === 'manual' ? 'custom' : 'auto',
    );

    let displayed = $derived<SerializedPreview | undefined>(
        project.getPreview(),
    );

    function isSingleGrapheme(text: string): boolean {
        return new UnicodeString(text).getLength() === 1;
    }

    function toAuto() {
        // Drop the manual pin. ProjectView's auto-update effect will
        // overwrite with the current live-evaluator glyph almost
        // immediately (it watches for `preview === undefined` and writes
        // without waiting for the debounce; see ProjectView.svelte).
        Projects.clearManualPreview(project.getID());
        customDraft = '';
    }

    function applyManual(glyph: string) {
        if (!isSingleGrapheme(glyph)) return;
        Projects.setManualPreview(project.getID(), glyph);
        customDraft = glyph;
    }
</script>

<Subheader text={(l) => l.ui.dialog.share.subheader.preview.header} />
<MarkupHTMLView
    markup={(l) => l.ui.dialog.share.subheader.preview.explanation}
/>

<div class="row">
    <!-- Live preview tile of the currently-applied glyph. -->
    <div
        class="preview"
        style:background={displayed?.background ?? null}
        style:color={displayed?.foreground ?? null}
        style:font-family={displayed?.face ?? null}
    >
        {#if displayed}{displayed.text}{:else}—{/if}
    </div>

    <Switch
        on={mode === 'custom'}
        offLabel="automatic"
        onLabel="chosen"
        offTip={(l) => l.ui.dialog.share.mode.preview.tips[0]}
        onTip={(l) => l.ui.dialog.share.mode.preview.tips[1]}
        toggle={(on) => {
            if (on) {
                // Switching to custom: seed with a single-grapheme value so
                // the cache reflects the new mode immediately. Default to
                // the currently-displayed auto glyph if it's a single
                // grapheme, otherwise a star.
                const seed =
                    displayed && isSingleGrapheme(displayed.text)
                        ? displayed.text
                        : '⭐';
                applyManual(seed);
            } else {
                toAuto();
            }
        }}
        shortcut={undefined}
    />
</div>

{#if mode === 'custom'}
    <div class="custom">
        <TextField
            id="preview-glyph-field"
            bind:text={customDraft}
            placeholder={(l) => l.ui.dialog.share.field.preview.placeholder}
            description={(l) => l.ui.dialog.share.field.preview.description}
            validator={(text) =>
                isSingleGrapheme(text)
                    ? true
                    : (l) => l.ui.dialog.share.error.invalidPreview}
            changed={(text) => {
                if (isSingleGrapheme(text)) applyManual(text);
            }}
            max="6em"
        />

        <GlyphChooser
            pick={(glyph) => applyManual(glyph)}
            glyph={displayed?.mode === 'manual' ? displayed.text : undefined}
        />
    </div>
{/if}

<style>
    .row {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .preview {
        width: 4rem;
        height: 4rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        background: var(--wordplay-inactive-color);
        border-radius: var(--wordplay-border-radius);
    }

    .custom {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>

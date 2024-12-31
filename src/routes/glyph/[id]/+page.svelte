<script module lang="ts">
    import type { FieldText, ModeText } from '@locale/UITexts';
    export type GlyphPageText = {
        header: string;
        prompt: string;
        field: {
            name: FieldText;
            description: FieldText;
            mode: ModeText<string[]>;
        };
        error: {
            name: string;
            description: string;
        };
    };

    // svelte-ignore non_reactive_update
    enum DrawingMode {
        Select,
        Pixel,
        Rect,
        Ellipse,
        Path,
    }
</script>

<script lang="ts">
    import { locales } from '@db/Database';
    import Header from '@components/app/Header.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import { GlyphSize, glyphToSVG } from '../../../glyphs/glyphs';
    import Page from '@components/app/Page.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import ColorChooser from '@components/widgets/ColorChooser.svelte';
    import { LCHtoRGB } from '@output/Color';

    let name = $state('');
    let description = $state('');

    /** The current drawing mode of the editor*/
    let mode: DrawingMode = $state(0);

    /** The current drawing color */
    let lightness = $state(50);
    let chroma = $state(100);
    let hue = $state(180);

    $inspect(LCHtoRGB(lightness, chroma, hue));

    /** Make the rendered shape as a preview */
    let shape = $derived({
        name,
        description,
        shapes: [],
    });

    $inspect(mode);

    function validName(name: string) {
        return name.length > 0;
    }
    function validDescription(description: string) {
        return description.length > 0;
    }

    let error = $derived(
        !validName(name)
            ? $locales.get((l) => l.ui.page.glyph.error.name)
            : !validDescription(description)
              ? $locales.get((l) => l.ui.page.glyph.error.description)
              : undefined,
    );
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.glyph.header)} — {name}</title>
</svelte:head>

<Page>
    <section>
        <div class="header">
            <Header>{$locales.get((l) => l.ui.page.glyph.header)}</Header>
            <p>{$locales.get((l) => l.ui.page.glyph.prompt)}</p>
        </div>
        <div class="editor">
            <div class="controls">
                <div class={['canvas', DrawingMode[mode].toLowerCase()]}>
                    <div class="grid">
                        <!-- Render gridlines below everything -->
                        {#each { length: GlyphSize }, x}
                            <div
                                class="line yline"
                                style="left: {100 * (x / GlyphSize)}%"
                            ></div>
                        {/each}
                        {#each { length: GlyphSize }, y}
                            <div
                                class="line xline"
                                style="top: {100 * (y / GlyphSize)}%"
                            ></div>
                        {/each}
                    </div>
                </div>
                <div class="palette">
                    <div class="preview">
                        {@html glyphToSVG(shape, 64)}
                    </div>
                    <Mode
                        descriptions={$locales.get(
                            (l) => l.ui.page.glyph.field.mode,
                        )}
                        modes={['👆', '■', '▬', '●', '◡']}
                        choice={mode}
                        select={(choice: number) =>
                            (mode = choice as DrawingMode)}
                        labeled={false}
                    ></Mode>
                    <ColorChooser
                        hue={lightness}
                        {chroma}
                        lightness={hue}
                        change={(l, c, h) => {
                            lightness = l;
                            chroma = c;
                            hue = h;
                        }}
                    ></ColorChooser>
                    <br />
                    cool
                    <br />
                    things
                </div>
            </div>
            <div class="labels">
                <TextField
                    bind:text={name}
                    placeholder={$locales.get(
                        (l) => l.ui.page.glyph.field.name.placeholder,
                    )}
                    description={$locales.get(
                        (l) => l.ui.page.glyph.field.name.description,
                    )}
                    done={() => {}}
                    validator={validName}
                ></TextField>
                <TextBox
                    inline
                    bind:text={description}
                    placeholder={$locales.get(
                        (l) => l.ui.page.glyph.field.description.placeholder,
                    )}
                    description={$locales.get(
                        (l) => l.ui.page.glyph.field.description.description,
                    )}
                    done={() => {}}
                    validator={validDescription}
                ></TextBox>
                {#if error}
                    <Feedback inline>{error}</Feedback>
                {/if}
            </div>
        </div>
    </section>
</Page>

<style>
    section {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        width: 100%;
        height: 100%;
        background: var(--wordplay-background);
        padding: var(--wordplay-spacing);
    }

    .header {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        border-bottom: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        align-items: baseline;
    }

    .editor {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
    }

    .select {
        cursor: default;
    }

    .rect,
    .ellipse,
    .path,
    .pixel {
        cursor: crosshair;
    }

    .labels {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
    }

    .controls {
        width: 100%;
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .canvas {
        flex: 1;
        aspect-ratio: 1/1;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
    }

    .palette {
        max-width: 20%;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .preview {
        aspect-ratio: 1/1;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
    }

    .grid {
        position: relative;
        width: 100%;
        height: 100%;

        .line {
            position: absolute;
            background: var(--wordplay-border-color);
        }

        .yline {
            width: var(--wordplay-border-width);
            top: 0;
            bottom: 0;
        }

        .xline {
            position: absolute;
            height: var(--wordplay-border-width);
            left: 0;
            right: 0;
            background: var(--wordplay-border-color);
        }
    }
</style>

<script lang="ts">
    /**
     * Add an image to a character by reducing it to pixels (#739).
     *
     * Entirely on the device: the file is decoded, sampled, and dropped. Nothing
     * is uploaded and nothing is stored, which is why the size limit here is
     * generous — it exists so a pathological file fails with a message instead
     * of hanging the tab, not because bytes cost anything.
     *
     * A dialog rather than a drawing mode: there is no drawing gesture, and a
     * mode would have to hide the 32x32 canvas to show a photograph.
     */
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Slider from '@components/widgets/Slider.svelte';
    import { locales } from '@db/Database';
    import {
        CharacterSize,
        type CharacterPixel,
    } from '@db/characters/Character';
    import {
        boxSample,
        clampCrop,
        pixelsFromRGBA,
        type Crop,
    } from '@db/characters/raster';

    interface Props {
        /** Lay the sampled pixels over the composition, as one edit. */
        add: (pixels: CharacterPixel[], crop: Crop) => void;
        /** Say something in the app's live region. */
        announce: (message: string) => void;
    }

    let { add, announce }: Props = $props();

    /**
     * The most we'll read from disk.
     *
     * Nothing leaves the device, so this isn't a bandwidth budget — a phone
     * photo is 3–6MB and a 48 megapixel one can reach 20MB, and all of those
     * should just work. It's here so a file that isn't a photo at all fails
     * with a message rather than locking the tab.
     */
    const MaxBytes = 25 * 1024 * 1024;

    /**
     * The most decoded pixels we'll draw.
     *
     * The byte cap doesn't bound this: a small PNG can expand to gigabytes of
     * RGBA, which is the actual hazard.
     */
    const MaxSourcePixels = 50_000_000;

    /**
     * How big the working copy is, at most.
     *
     * Everything — the preview, the crop math, the final sampling — runs on one
     * buffer this size, so dragging the box re-averages in well under a frame.
     * 512 into 32 still leaves 16x16 samples per cell, far more than a 32x32
     * result can use.
     */
    const WorkingSize = 512;

    let picker: HTMLInputElement | undefined = $state(undefined);
    let problem = $state<'tooBig' | 'unreadable' | null>(null);
    let chosenSize = $state(0);

    /** The working copy: the image drawn down to at most WorkingSize a side. */
    let source = $state<{
        data: Uint8ClampedArray;
        width: number;
        height: number;
    } | null>(null);
    let crop = $state<Crop>({ x: 0, y: 0, size: 1 });
    /** Whether the arrow keys move the box, rather than scrolling the dialog. */
    let moving = $state(false);
    /** Where the box was when move mode began, so escape can put it back. */
    let movingFrom: Crop | null = null;

    let previewCanvas: HTMLCanvasElement | undefined = $state(undefined);
    let sourceCanvas: HTMLCanvasElement | undefined = $state(undefined);

    /** The 32x32 the crop currently reduces to. */
    let sampled = $derived(
        source === null
            ? null
            : boxSample(source.data, source.width, source.height, crop),
    );

    /** Paint the working copy once it's read. */
    $effect(() => {
        const canvas = sourceCanvas;
        const image = source;
        if (canvas === undefined || image === null) return;
        const ctx = canvas.getContext('2d');
        if (ctx === null) return;
        ctx.putImageData(
            new ImageData(
                new Uint8ClampedArray(image.data),
                image.width,
                image.height,
            ),
            0,
            0,
        );
    });

    /** Paint the preview whenever the sample changes. */
    $effect(() => {
        const canvas = previewCanvas;
        const rgba = sampled;
        if (canvas === undefined || rgba === null) return;
        const ctx = canvas.getContext('2d');
        if (ctx === null) return;
        ctx.clearRect(0, 0, CharacterSize, CharacterSize);
        ctx.putImageData(
            new ImageData(
                new Uint8ClampedArray(rgba),
                CharacterSize,
                CharacterSize,
            ),
            0,
            0,
        );
    });

    async function choose() {
        const file = picker?.files?.[0];
        if (file === undefined) return;
        problem = null;
        source = null;
        try {
            await read(file);
        } finally {
            // Let the same file be chosen again after a failure.
            if (picker) picker.value = '';
        }
    }

    async function read(file: File) {
        if (file.size > MaxBytes) {
            chosenSize = file.size;
            problem = 'tooBig';
            return;
        }

        let bitmap: ImageBitmap;
        try {
            bitmap = await createImageBitmap(file);
        } catch {
            problem = 'unreadable';
            return;
        }

        try {
            if (bitmap.width * bitmap.height > MaxSourcePixels) {
                problem = 'unreadable';
                return;
            }

            // Draw once into a bounded working canvas. Never upscale: a 16x16
            // icon has nothing to gain from being blown up first.
            const scale = Math.min(
                1,
                WorkingSize / Math.max(bitmap.width, bitmap.height),
            );
            const width = Math.max(1, Math.round(bitmap.width * scale));
            const height = Math.max(1, Math.round(bitmap.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx === null) {
                problem = 'unreadable';
                return;
            }
            ctx.drawImage(bitmap, 0, 0, width, height);
            source = {
                data: ctx.getImageData(0, 0, width, height).data,
                width,
                height,
            };
            // Open on the largest centered square, so an already-square image
            // needs no interaction at all.
            const size = Math.min(width, height);
            crop = clampCrop(
                {
                    size,
                    x: Math.round((width - size) / 2),
                    y: Math.round((height - size) / 2),
                },
                width,
                height,
            );
        } finally {
            bitmap.close();
        }
    }

    function setCrop(next: Crop) {
        if (source === null) return;
        crop = clampCrop(next, source.width, source.height);
    }

    /** Say where the box is. The position rides along because it is the only
     *  thing that differs between two consecutive moves. */
    function announceCrop() {
        announce(
            $locales
                .concretize((l) => l.ui.page.character.announce.cropped, {
                    x: crop.x,
                    y: crop.y,
                })
                .toText(),
        );
    }

    function handleKey(event: KeyboardEvent) {
        if (source === null) return;
        if (event.key === 'Enter' || event.key === ' ') {
            moving = !moving;
            if (moving) movingFrom = { ...crop };
            announce(
                $locales.getPrimaryPlainText(
                    moving
                        ? (l) => l.ui.page.character.announce.cropMoving
                        : (l) => l.ui.page.character.announce.cropDone,
                ),
            );
            event.preventDefault();
            return;
        }
        if (event.key === 'Escape' && moving) {
            if (movingFrom !== null) crop = movingFrom;
            moving = false;
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (!moving) return;
        const step = event.shiftKey ? 10 : 1;
        const deltas: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
        };
        const delta = deltas[event.key];
        if (delta === undefined) return;
        const before = crop;
        setCrop({ ...crop, x: crop.x + delta[0], y: crop.y + delta[1] });
        // Only speak when the box actually moved. At the edge of the image, or
        // when the crop fills it, an arrow changes nothing — and a live region
        // repeating the same words is heard once and then not at all.
        if (crop.x !== before.x || crop.y !== before.y) announceCrop();
        event.preventDefault();
    }

    /** Drag state, in working-copy pixels. */
    let dragging: {
        pointer: number;
        fromX: number;
        fromY: number;
        cropX: number;
        cropY: number;
    } | null = null;

    function pointerToSource(
        event: PointerEvent,
    ): { x: number; y: number } | null {
        if (!(event.currentTarget instanceof HTMLElement) || source === null)
            return null;
        const bounds = event.currentTarget.getBoundingClientRect();
        return {
            x: ((event.clientX - bounds.left) / bounds.width) * source.width,
            y: ((event.clientY - bounds.top) / bounds.height) * source.height,
        };
    }

    function startDrag(event: PointerEvent) {
        const at = pointerToSource(event);
        if (at === null || !(event.currentTarget instanceof HTMLElement))
            return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging = {
            pointer: event.pointerId,
            fromX: at.x,
            fromY: at.y,
            cropX: crop.x,
            cropY: crop.y,
        };
    }

    function drag(event: PointerEvent) {
        if (dragging === null || dragging.pointer !== event.pointerId) return;
        const at = pointerToSource(event);
        if (at === null) return;
        setCrop({
            ...crop,
            x: dragging.cropX + (at.x - dragging.fromX),
            y: dragging.cropY + (at.y - dragging.fromY),
        });
    }

    function endDrag(event: PointerEvent) {
        if (dragging === null || dragging.pointer !== event.pointerId) return;
        const moved = crop.x !== dragging.cropX || crop.y !== dragging.cropY;
        dragging = null;
        if (moved) announceCrop();
    }

    function confirm() {
        if (sampled === null) return;
        add(pixelsFromRGBA(sampled), crop);
        source = null;
    }
</script>

<div class="importer">
    <!-- The real input is hidden because a file input can't be styled to match
         the palette; the button below is its label and does the work. -->
    <input
        type="file"
        accept="image/*"
        bind:this={picker}
        onchange={choose}
        aria-label={$locales.getPrimaryPlainText(
            (l) => l.ui.page.character.image.button.tip,
        )}
    />
    <div class="body">
        <Button
            background
            tip={(l) => l.ui.page.character.image.button.tip}
            action={() => picker?.click()}
            icon="🖼"
            label={(l) => l.ui.page.character.image.button.label}
        />

        {#if problem === 'tooBig'}
            <Notice
                ><MarkupHTMLView
                    inline
                    markup={[
                        (l) => l.ui.page.character.feedback.imageTooBig,
                        {
                            size: (chosenSize / 1024 / 1024).toFixed(1),
                            limit: `${MaxBytes / 1024 / 1024}`,
                        },
                    ]}
                /></Notice
            >
        {:else if problem === 'unreadable'}
            <Notice
                text={(l) => l.ui.page.character.feedback.imageUnreadable}
            />
        {/if}

        {#if source !== null}
            <div id="crop-instructions">
                <MarkupHTMLView
                    markup={(l) => l.ui.page.character.image.instructions}
                />
            </div>
            <div class="stage">
                <!-- role="application" is correct for a region that owns
                         pointer gestures and arrow-key commands, the same
                         choice the character canvas documents; Svelte's linter
                         doesn't treat application as interactive. -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <div
                    class="image"
                    role="application"
                    aria-label={$locales.getPrimaryPlainText(
                        (l) => l.ui.page.character.image.crop.label,
                    )}
                    aria-describedby="crop-instructions"
                    style:aspect-ratio="{source.width} / {source.height}"
                    onpointerdown={startDrag}
                    onpointermove={drag}
                    onpointerup={endDrag}
                >
                    <canvas
                        class="source"
                        width={source.width}
                        height={source.height}
                        aria-hidden="true"
                        bind:this={sourceCanvas}
                    ></canvas>
                    <button
                        class="crop"
                        class:moving
                        aria-pressed={moving}
                        aria-label={`${$locales.getPrimaryPlainText((l) => l.ui.page.character.image.crop.label)} ${crop.x} ${crop.y}`}
                        onkeydown={handleKey}
                        style:left="{(100 * crop.x) / source.width}%"
                        style:top="{(100 * crop.y) / source.height}%"
                        style:width="{(100 * crop.size) / source.width}%"
                        style:height="{(100 * crop.size) / source.height}%"
                    ></button>
                </div>
                <!-- role="img" on the wrapper, not the canvas: a canvas is
                         already a graphics element and can't take the role. -->
                <div
                    class="preview"
                    role="img"
                    aria-label={$locales.getPrimaryPlainText(
                        (l) => l.ui.page.character.image.preview,
                    )}
                >
                    <canvas
                        width={CharacterSize}
                        height={CharacterSize}
                        bind:this={previewCanvas}
                        aria-hidden="true"
                    ></canvas>
                </div>
            </div>
            <Slider
                label={(l) => l.ui.page.character.image.size.label}
                tip={(l) => l.ui.page.character.image.size.tip}
                min={8}
                max={Math.min(source.width, source.height)}
                increment={1}
                precision={0}
                unit={''}
                value={crop.size}
                change={(value) => setCrop({ ...crop, size: value.toNumber() })}
            ></Slider>
            <Button
                background
                tip={(l) => l.ui.page.character.image.add.tip}
                action={confirm}
                icon="✓"
                label={(l) => l.ui.page.character.image.add.label}
            />
        {/if}
    </div>
</div>

<style>
    input[type='file'] {
        display: none;
    }

    .body {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: start;
        width: 100%;
    }

    /* Wraps when the column is too narrow to hold the image beside its preview. */
    .stage {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
        align-items: start;
        width: 100%;
    }

    /* Fills the palette column it now lives in, rather than the viewport-sized
       box it had as a dialog. */
    .image {
        position: relative;
        /* Shares the row with the preview and gives up width first, down to a
           floor where the crop box is still draggable. */
        flex: 1 1 8em;
        min-width: 8em;
        touch-action: none;
    }

    .source {
        width: 100%;
        height: 100%;
        display: block;
    }

    /* The box is a real button so Enter toggling move mode is announced as a
       pressed state, rather than needing a message of its own. */
    .crop {
        position: absolute;
        margin: 0;
        padding: 0;
        background: none;
        border: var(--wordplay-focus-width) solid
            var(--wordplay-highlight-color);
        cursor: move;
    }

    .crop.moving {
        border-style: dashed;
    }

    .preview {
        width: 6em;
        height: 6em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
    }

    .preview canvas {
        width: 100%;
        height: 100%;
        display: block;
        image-rendering: pixelated;
    }
</style>

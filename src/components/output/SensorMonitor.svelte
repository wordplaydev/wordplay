<script lang="ts">
    import { acquireAudioSource, type AudioSourceHandle } from '@input/AudioSource';
    import { acquireCameraSource, type CameraSourceHandle } from '@input/CameraSource';
    import { getSensorPanelStack } from '@components/project/Contexts';
    import Emoji from '@components/app/Emoji.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { onDestroy, untrack } from 'svelte';
    import type { Database } from '@db/Database';
    import type Evaluator from '@runtime/Evaluator';
    import Hand from '@input/Hand';
    import Face from '@input/Face';
    import { VOLUME_FFT_SIZE, computeVolume, PITCH_FFT_SIZE, computePitch } from '@input/AudioAnalysisMath';
    import { PitchDetector } from 'pitchy';

    type SensorKind = 'microphone' | 'camera';

    interface Props {
        kind: SensorKind;
        database: Database;
        evaluator?: Evaluator;
    }

    let { kind, database, evaluator }: Props = $props();

    let expanded = $state(false);
    let audioHandle: AudioSourceHandle | undefined = $state(undefined);
    let cameraHandle: CameraSourceHandle | undefined = $state(undefined);
    let canvasElement: HTMLCanvasElement | undefined = $state(undefined);
    let videoElement: HTMLVideoElement | undefined = $state(undefined);
    let landmarkCanvasElement: HTMLCanvasElement | undefined = $state(undefined);
    let panelElement: HTMLDivElement | undefined = $state(undefined);
    let animationFrameId: number | undefined;
    let panelOffset = $state('0px');
    let handPoints: { x: number; y: number }[] = [];
    let facePoints: { x: number; y: number }[] = [];
    let volumeAnalyzer: AnalyserNode | undefined;
    let volumeDataArray: Uint8Array | undefined;
    let pitchAnalyzer: AnalyserNode | undefined;
    let pitchDataArray: Float32Array | undefined;
    let pitchDetector: PitchDetector<Float32Array> | undefined;

    const stack = getSensorPanelStack();

    function drawLandmarkOverlay() {
        try {
            if (
                !landmarkCanvasElement ||
                !videoElement ||
                videoElement.readyState < 2 ||
                !videoElement.videoWidth ||
                !videoElement.videoHeight
            ) {
                return;
            }

            const rect = landmarkCanvasElement.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;

            // Cap canvas size to prevent memory exhaustion (max 4096x4096 physical pixels)
            const dpr = window.devicePixelRatio || 1;
            const maxPhysicalSize = 4096;
            const canvasWidth = Math.min(Math.ceil(rect.width * dpr), maxPhysicalSize);
            const canvasHeight = Math.min(Math.ceil(rect.height * dpr), maxPhysicalSize);
            landmarkCanvasElement.width = canvasWidth;
            landmarkCanvasElement.height = canvasHeight;

            const ctx = landmarkCanvasElement.getContext('2d', { alpha: true });
            if (!ctx) return;
            ctx.scale(dpr, dpr);

            // Use the original rect dimensions for coordinate calculations (not the capped canvas size)
            const width = rect.width;
            const height = rect.height;

            // Calculate transform for object-fit: cover
            const scale = Math.max(
                width / videoElement.videoWidth,
                height / videoElement.videoHeight,
            );
            const offsetX = (width - videoElement.videoWidth * scale) / 2;
            const offsetY = (height - videoElement.videoHeight * scale) / 2;

            // Get foreground color for landmarks and compute CSS functions
            let fgColor = '#ffff00';
            try {
                const temp = document.createElement('span');
                temp.style.color = 'var(--wordplay-highlight-color)';
                document.body.appendChild(temp);
                const computed = getComputedStyle(temp).color;
                document.body.removeChild(temp);
                if (computed) fgColor = computed;
            } catch (e) {
                // Fallback to default yellow
            }
            // Draw hand points (larger, opaque)
            ctx.fillStyle = fgColor;
            for (let i = 0; i < handPoints.length; i++) {
                const point = handPoints[i];
                const pixelX =
                    point.x * videoElement.videoWidth * scale + offsetX;
                const pixelY =
                    point.y * videoElement.videoHeight * scale + offsetY;
                ctx.beginPath();
                ctx.arc(pixelX, pixelY, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw face points (smaller, opaque)
            ctx.fillStyle = fgColor;
            for (const point of facePoints) {
                const pixelX =
                    point.x * videoElement.videoWidth * scale + offsetX;
                const pixelY =
                    point.y * videoElement.videoHeight * scale + offsetY;
                ctx.beginPath();
                ctx.arc(pixelX, pixelY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } catch (e) {
            // Silently catch any canvas errors to prevent breaking the hand detection
            console.error('Landmark overlay error:', e);
        }
    }

    function toggleExpanded() {
        expanded = !expanded;
        if (expanded) {
            // Acquire handles immediately; effects will start monitoring once DOM is mounted
            if (kind === 'microphone') {
                audioHandle = acquireAudioSource(database);
            } else {
                cameraHandle = acquireCameraSource(database, 15, undefined);
            }
        }
    }

    // Microphone monitoring: start once canvas element exists and handle is acquired
    $effect(() => {
        if (!expanded || kind !== 'microphone' || !canvasElement || !audioHandle)
            return;

        // Resume audio context (must happen in user-gesture context)
        const context = audioHandle.getContext();
        if (context) context.resume().catch(() => {});

        let analyzer: AnalyserNode | undefined;
        let dataArray: Uint8Array | undefined;

        function draw() {
            if (!expanded || !canvasElement || !audioHandle) {
                if (animationFrameId !== undefined) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = undefined;
                }
                return;
            }

            // Lazily initialize analyzers once handle is ready
            if (analyzer === undefined && audioHandle.isReady()) {
                const ctx = audioHandle.getContext();
                const sourceNode = audioHandle.getSourceNode();
                if (ctx !== undefined && sourceNode !== undefined) {
                    // Waveform analyzer (fftSize 256)
                    analyzer = ctx.createAnalyser();
                    analyzer.fftSize = 256;
                    sourceNode.connect(analyzer);
                    dataArray = new Uint8Array(analyzer.frequencyBinCount);

                    // Volume analyzer (fftSize 32)
                    volumeAnalyzer = ctx.createAnalyser();
                    volumeAnalyzer.fftSize = VOLUME_FFT_SIZE;
                    sourceNode.connect(volumeAnalyzer);
                    volumeDataArray = new Uint8Array(volumeAnalyzer.frequencyBinCount);

                    // Pitch analyzer (fftSize 1024)
                    pitchAnalyzer = ctx.createAnalyser();
                    pitchAnalyzer.fftSize = PITCH_FFT_SIZE;
                    sourceNode.connect(pitchAnalyzer);
                    pitchDataArray = new Float32Array(pitchAnalyzer.fftSize);
                    pitchDetector = PitchDetector.forFloat32Array(PITCH_FFT_SIZE);
                }
            }

            if (analyzer !== undefined && dataArray !== undefined && canvasElement) {
                analyzer.getByteTimeDomainData(dataArray as any);

                const canvasContext = canvasElement.getContext('2d');
                if (canvasContext === null) return;

                // Set canvas to actual display size (CSS size → device pixels)
                const rect = canvasElement.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                canvasElement.width = rect.width * dpr;
                canvasElement.height = rect.height * dpr;
                canvasContext.scale(dpr, dpr);

                const width = rect.width;
                const height = rect.height;

                // Clear canvas with CSS variable color
                const style = getComputedStyle(canvasElement);
                const bgColor = style.backgroundColor || '#ffffff';
                canvasContext.fillStyle = bgColor;
                canvasContext.fillRect(0, 0, width, height);

                // Compute volume
                let volume = 0;
                if (
                    volumeAnalyzer &&
                    volumeDataArray &&
                    context
                ) {
                    volumeAnalyzer.getByteFrequencyData(
                        volumeDataArray as any,
                    );
                    volume = computeVolume(
                        context.sampleRate,
                        volumeDataArray as any,
                    );
                }

                // Compute pitch
                let pitch = 0;
                if (
                    pitchAnalyzer &&
                    pitchDataArray &&
                    pitchDetector &&
                    context
                ) {
                    pitchAnalyzer.getFloatTimeDomainData(
                        pitchDataArray as any,
                    );
                    pitch = computePitch(
                        pitchDetector,
                        context.sampleRate,
                        pitchDataArray as any,
                    );
                }

                // Draw waveform with opacity based on volume
                canvasContext.lineWidth = 2;
                const fgColor = style.color || '#000000';
                canvasContext.strokeStyle = fgColor;
                // Interpolate opacity from 0.4 to 1.0 based on volume (0..1)
                canvasContext.globalAlpha = 0.4 + volume * 0.6;
                canvasContext.beginPath();

                for (let i = 0; i < dataArray.length; i++) {
                    const x = (i / dataArray.length) * width;
                    const y = ((dataArray[i] - 128) / 128) * (height / 2) + height / 2;

                    if (i === 0) canvasContext.moveTo(x, y);
                    else canvasContext.lineTo(x, y);
                }

                canvasContext.stroke();
                canvasContext.globalAlpha = 1;

                // Draw volume indicator bar on the right
                const barWidth = 3;
                const barHeight = Math.max(2, (volume / 1) * height);
                canvasContext.fillStyle = fgColor;
                canvasContext.fillRect(
                    width - barWidth - 4,
                    height - barHeight,
                    barWidth,
                    barHeight,
                );

                // Draw pitch indicator line (horizontal, mapped to voice range 50-400Hz)
                if (pitch > 0) {
                    const minPitch = 50;
                    const maxPitch = 400;
                    const pitchFraction = Math.max(
                        0,
                        Math.min(1, (pitch - minPitch) / (maxPitch - minPitch)),
                    );
                    const pitchY = height - pitchFraction * height;

                    canvasContext.strokeStyle = fgColor;
                    canvasContext.globalAlpha = 0.8;
                    canvasContext.lineWidth = 2;
                    canvasContext.setLineDash([4, 4]);
                    canvasContext.beginPath();
                    canvasContext.moveTo(0, pitchY);
                    canvasContext.lineTo(width, pitchY);
                    canvasContext.stroke();
                    canvasContext.setLineDash([]);
                    canvasContext.globalAlpha = 1;
                }
            }

            animationFrameId = requestAnimationFrame(draw);
        }

        draw();

        return () => {
            if (animationFrameId !== undefined) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = undefined;
            }
        };
    });

    // Camera monitoring: start once video element exists and handle is acquired
    $effect(() => {
        if (!expanded || kind !== 'camera' || !videoElement || !cameraHandle)
            return;

        let retryTimeout: ReturnType<typeof setTimeout> | undefined;

        function attachVideo() {
            if (!videoElement || !cameraHandle || !expanded) return;

            const sharedVideo = cameraHandle.getVideoElement();
            if (sharedVideo?.srcObject instanceof MediaStream) {
                videoElement.srcObject = sharedVideo.srcObject;
                // Explicitly call play() since srcObject was assigned programmatically
                videoElement.play().catch(() => {});
            } else {
                // Retry after a short delay if not ready yet
                retryTimeout = setTimeout(attachVideo, 50);
            }
        }

        attachVideo();

        return () => {
            if (retryTimeout !== undefined) clearTimeout(retryTimeout);
            if (videoElement) videoElement.srcObject = null;
        };
    });

    // Landmark subscription: subscribe to Hand and Face streams when camera panel opens
    $effect(() => {
        if (!expanded || kind !== 'camera') return;

        const unsubscribers: Array<() => void> = [];

        untrack(() => {
            if (!evaluator) return;

            const handStreams = evaluator.getBasisStreamsOfType(Hand);
            const faceStreams = evaluator.getBasisStreamsOfType(Face);

            for (const stream of handStreams) {
                const unsubscribe = stream.observeLandmarks((result: any) => {
                    try {
                        handPoints = [];
                        const landmarks = result.landmarks?.[0];
                        if (landmarks) {
                            for (const landmark of landmarks) {
                                handPoints.push({
                                    x: landmark.x,
                                    y: landmark.y,
                                });
                            }
                        }
                        drawLandmarkOverlay();
                    } catch (e) {
                        console.error('Hand landmark observer error:', e);
                    }
                });
                unsubscribers.push(unsubscribe);
            }

            for (const stream of faceStreams) {
                const unsubscribe = stream.observeLandmarks((result: any) => {
                    try {
                        facePoints = [];
                        const landmarks = result.faceLandmarks?.[0];
                        if (landmarks) {
                            for (const landmark of landmarks) {
                                facePoints.push({
                                    x: landmark.x,
                                    y: landmark.y,
                                });
                            }
                        }
                        drawLandmarkOverlay();
                    } catch (e) {
                        console.error('Face landmark observer error:', e);
                    }
                });
                unsubscribers.push(unsubscribe);
            }
        });

        return () => {
            unsubscribers.forEach((fn) => fn());
        };
    });

    // Register/unregister with the stack based on expansion state
    $effect(() => {
        if (!expanded) return;

        untrack(() => {
            stack?.register(kind);
        });

        return () => {
            untrack(() => {
                stack?.unregister(kind);
            });
        };
    });

    // Update panel height reporting for stacking and position for stack offset
    $effect(() => {
        if (!expanded || !panelElement) return;

        // Measure panel to report its height for stacking calculation
        const panelRect = panelElement.getBoundingClientRect();
        const panelHeight = panelRect.height;

        untrack(() => {
            if (!stack) return;
            stack.reportHeight(kind, panelHeight);

            // Position this panel based on how many panels are stacked above it
            // CSS calc(100% + var(--panel-offset)) pins bottom edge to top of .stage-controls-row,
            // so --panel-offset is only the extra gap for stacked panels
            const offsetAbove = stack.offsetAbove(kind, 8); // 8px gap between panels
            panelOffset = offsetAbove > 0 ? `${offsetAbove}px` : '0px';
        });
    });

    onDestroy(() => {
        if (animationFrameId !== undefined) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = undefined;
        }

        if (audioHandle !== undefined) {
            audioHandle.release();
            audioHandle = undefined;
        }

        if (cameraHandle !== undefined) {
            cameraHandle.release();
            cameraHandle = undefined;
        }

        if (videoElement !== undefined) {
            videoElement.srcObject = null;
        }

        // Note: stack.unregister is already called by the $effect cleanup,
        // so we don't call it again here to avoid double-unregister
    });
</script>

<!-- Sensor monitor toggle: icon button with expanded preview panel -->
<span class="sensor-monitor-container">
    <Toggle
        tips={(l) =>
            kind === 'microphone'
                ? l.ui.output.sensor.microphone
                : l.ui.output.sensor.camera}
        on={expanded}
        toggle={toggleExpanded}
    >
        <Emoji text={kind === 'microphone' ? '🎤' : '📷'} />
    </Toggle>

    <!-- Expanded preview panel, stacked above the toggles -->
    {#if expanded}
        <div
            class="sensor-panel"
            bind:this={panelElement}
            style="--panel-offset: {panelOffset}"
        >
            {#if kind === 'microphone'}
                <div class="microphone-preview">
                    <canvas
                        bind:this={canvasElement}
                        class="waveform-canvas"
                    ></canvas>
                </div>
            {:else}
                <div class="camera-preview">
                    <video
                        bind:this={videoElement}
                        autoplay
                        muted
                        class="preview-video"
                    ></video>
                    <canvas
                        bind:this={landmarkCanvasElement}
                        class="landmark-overlay"
                    ></canvas>
                </div>
            {/if}
        </div>
    {/if}
</span>

<style>
    .sensor-monitor-container {
        display: inline-flex;
        pointer-events: auto;
    }

    .sensor-panel {
        position: absolute;
        inset-inline-end: var(--wordplay-spacing);
        inset-block-end: calc(100% + var(--panel-offset, 0px));
        background-color: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 100;
        pointer-events: auto;
        width: max(10cqw, 200px);
        min-height: 120px;
    }

    .microphone-preview {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--wordplay-chrome);
        border-radius: calc(var(--wordplay-border-radius) / 2);
        overflow: hidden;
        aspect-ratio: 2 / 1;
    }

    .waveform-canvas {
        display: block;
        width: 100%;
        height: 100%;
        background-color: var(--wordplay-chrome);
    }

    .camera-preview {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--wordplay-chrome);
        border-radius: calc(var(--wordplay-border-radius) / 2);
        overflow: hidden;
        aspect-ratio: 1 / 1;
    }

    .preview-video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .landmark-overlay {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        background: transparent;
    }
</style>

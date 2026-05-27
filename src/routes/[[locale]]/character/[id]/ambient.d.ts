// The EyeDropper web API is not fully supported yet, so we need to define some types for it. See https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper for more details.

interface ColorSelectionOptions {
    signal?: AbortSignal;
}

interface ColorSelectionResult {
    sRGBHex: string;
}

interface EyeDropper {
    open: (options?: ColorSelectionOptions) => Promise<ColorSelectionResult>;
}

interface EyeDropperConstructor {
    new (): EyeDropper;
}

interface Window {
    EyeDropper?: EyeDropperConstructor | undefined;
}

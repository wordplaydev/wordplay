import Setting from '@db/settings/Setting';

/**
 * The persisted state of a collapsible, resizable editor sidebar (e.g. the
 * Annotations and Wellspring panels). Whether it's shown and how wide it is are
 * stored together since they're a single conceptual preference. Device-specific
 * — width depends on screen size, and layout preferences are per-device.
 */
export type SidebarState = {
    shown: boolean;
    width: number;
};

/**
 * Build a sidebar setting. Validates the stored `{ shown, width }` object,
 * clamps the width, and migrates the legacy boolean shape (from when "shown"
 * and "width" were two separate settings) to `{ shown, width: default }`.
 */
export function makeSidebarSetting(
    key: string,
    defaults: {
        shown: boolean;
        width: number;
        minWidth: number;
        maxWidth: number;
    },
): Setting<SidebarState> {
    return new Setting<SidebarState>(
        key,
        true,
        { shown: defaults.shown, width: defaults.width },
        (value) => validate(value, defaults),
        (a, b) => a.shown === b.shown && a.width === b.width,
    );
}

function validate(
    value: unknown,
    defaults: { width: number; minWidth: number; maxWidth: number },
): SidebarState | undefined {
    // Legacy boolean (when "shown" was its own setting): keep the choice, use
    // the default width. The companion width setting is migrated separately.
    if (typeof value === 'boolean')
        return { shown: value, width: defaults.width };
    if (typeof value !== 'object' || value === null) return undefined;
    const state = value as Record<string, unknown>;
    if (typeof state.shown !== 'boolean') return undefined;
    if (typeof state.width !== 'number' || !Number.isFinite(state.width))
        return undefined;
    return {
        shown: state.shown,
        width: Math.min(defaults.maxWidth, Math.max(defaults.minWidth, state.width)),
    };
}

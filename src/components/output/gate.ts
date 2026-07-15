import type { Flag } from '@db/projects/Moderation';
import type { PermissionName } from '@input/permissions';
import { Permission } from '@input/permissions';
import type { LocaleTextAccessor } from '@locale/Locales';
import type { PhotosensitivityRisk } from '@output/PhotosensitivityAnalysis';

/**
 * The reasons the start gate blocks a project from playing on load, unified
 * across browser permissions, moderation warnings, and photosensitivity
 * warnings. A {@link GateWarning} can be acknowledged (the viewer clicks
 * Start); a {@link GateBlock} cannot (the content stays blocked).
 */
export type GateWarning =
    | { kind: 'permission'; permission: PermissionName }
    // moderated: true ⇒ a moderator flagged it; false ⇒ not yet moderated.
    | { kind: 'moderation'; flag: Flag; moderated: boolean }
    | { kind: 'photosensitivity'; risk: PhotosensitivityRisk };

export type GateBlock = { kind: 'moderation'; flag: Flag };

/** The localized description shown for a single gate item. */
export function gateItemDescription(
    item: GateWarning | GateBlock,
): LocaleTextAccessor {
    switch (item.kind) {
        case 'permission':
            return (l) => l.ui.output.permission[item.permission];
        case 'moderation':
            return (l) => l.moderation.flags[item.flag];
        case 'photosensitivity':
            return (l) => l.photosensitivity.categories[item.risk];
    }
}

/** A stable string key for a gate item, for keyed `{#each}` iteration. */
export function gateItemKey(item: GateWarning | GateBlock): string {
    switch (item.kind) {
        case 'permission':
            return `permission-${item.permission}`;
        case 'moderation':
            return `moderation-${item.flag}`;
        case 'photosensitivity':
            return `photosensitivity-${item.risk}`;
    }
}

/** The emoji shown beside a gate item, by kind. */
export function gateItemEmoji(item: GateWarning | GateBlock): string {
    switch (item.kind) {
        case 'permission':
            return item.permission === Permission.Microphone ? '🎤' : '📷';
        case 'moderation':
            return '⚠️';
        case 'photosensitivity':
            return '⚡';
    }
}

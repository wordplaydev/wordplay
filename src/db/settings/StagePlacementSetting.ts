import Setting from '#db/settings/Setting.ts';
import {
    StagePlacement,
    StagePlacementOrder,
    type StagePlacementType,
} from '#db/settings/StagePlacement.ts';

/** Device specific, like the arrangement it mirrors: which shape a screen is,
 *  and so where the stage best sits on it, is a fact about the device. */
export const StagePlacementSetting = new Setting<StagePlacementType>(
    'stagePlacement',
    true,
    StagePlacement.TopRight,
    (value) =>
        typeof value === 'string'
            ? StagePlacementOrder.find((placement) => placement === value)
            : undefined,
    (current, value) => current === value,
);

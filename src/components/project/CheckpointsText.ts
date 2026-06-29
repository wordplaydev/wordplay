import type { Template } from '@locale/LocaleText';

type CheckpointsText = {
    /** [plain] Labels in the checkpoints/revisions panel */
    label: {
        now: string;
        history: string;
        restore: string;
        ago: Template<['amount', 'unit']>;
    };
    /** [plain] Buttons in the checkpoints/revisions panel */
    button: {
        clear: string;
        select: string;
        checkpoint: string;
        back: string;
        forward: string;
        restore: string;
        now: string;
    };
};

export type { CheckpointsText as default };

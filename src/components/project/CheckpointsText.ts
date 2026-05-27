import type { Template } from '@locale/LocaleText';

type CheckpointsText = {
    label: {
        now: string;
        history: string;
        restore: string;
        ago: Template<['amount', 'unit']>;
    };
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

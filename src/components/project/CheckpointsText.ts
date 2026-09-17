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
    /** What restoring this version would do (#633). Phrased as the consequence of the Restore button beside it, since that is the decision being made. */
    diff: {
        /** [plain] On the banner: what restoring would do. $back counts code that would come back; $gone counts code it would take away. */
        summary: Template<['#back', '#gone']>;
        /** [plain] On the banner, when restoring this version would change nothing. A separate string because English has no zero plural form, so the counts above can't say it. */
        unchanged: string;
        /** [plain] Said when the caret lands on code that only this version has, which restoring would bring back */
        atReturns: string;
        /** [plain] Said when the caret lands where the current version has code this one doesn't, which restoring would take away. $code is that code. */
        atLeaves: Template<['code']>;
        /** [plain] Said when the caret lands on code that would come back in place of $code, which restoring would take away */
        atBoth: Template<['code']>;
    };
};

export type { CheckpointsText as default };

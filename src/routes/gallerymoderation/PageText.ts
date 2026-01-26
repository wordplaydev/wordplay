import type { ButtonText } from "@locale/UITexts";

type PageText = {
    header: string;
    description: string;
    labels: {
        message: string;
        reporter: string;
        action: string;
    }
    view: ButtonText;
    remove: ButtonText;
    keep: ButtonText;
    empty: string;
    error: string;
}

export type { PageText as default };

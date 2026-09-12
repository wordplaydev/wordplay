import type { FormattedText } from '@locale/LocaleText';
import type { Template } from '@locale/LocaleText';

/** Text for published kits (#8), which are a section of the guide: `ui.docs.kits`. */
type KitsText = {
    /** [plain] Names the published-kit section of the guide */
    header: string;
    /** [plain] Names the group of a creator's own kits that the registry doesn't list yet */
    yours: string;
    /** [formatted] Explanation of what a kit is and how to use one */
    prompt: FormattedText;
    /** [formatted] Shown before anyone has published a kit */
    empty: FormattedText;
    /** [formatted] Shown when a search or a kind filter matches no kit */
    none: FormattedText;
    /** The filter over what kits share */
    kinds: {
        /** [plain] Describes the filter for screen readers */
        label: string;
        /** [plain] The option that filters nothing out */
        all: string;
    };
    /** [plain] Labels what a kit shares, e.g. "shares sunset, fade" */
    shares: Template<['names']>;
    /** [formatted] Shown on a kit's page when there is no such kit */
    missing: FormattedText;
    /** [formatted] Shown on a kit's page when that version isn't there */
    missingVersion: FormattedText;
    /** [plain] Shown on a kit's page when it shares nothing readable */
    nothing: string;
    /** [formatted] Heads the list of a kit's published versions on its page */
    versions: FormattedText;
    /** One published version, as a link to it */
    version: {
        /** [plain] Tooltip for the link to another version of a kit */
        tip: string;
    };
    /** [plain] Tooltip for the link from a registry tile to a kit's page */
    open: string;
};

export type { KitsText as default };

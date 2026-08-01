import type { HeaderAndExplanationText } from '@locale/UITexts';
import type { FormattedText } from '@locale/LocaleText';

/**
 * The warning a viewer sees before a project with risky music plays, and the
 * name of each risk. Sibling of `PhotosensitivityTexts`, shown through the
 * same start gate.
 */
type MusicSafetyTexts = {
    /** The header and explanation of the music warning */
    warning: HeaderAndExplanationText;
    categories: {
        /** [formatted] A large jump in volume, especially after quiet */
        startle: FormattedText;
        /** [formatted] Long stretches near full volume, or many tracks summing loud */
        loudness: FormattedText;
        /** [formatted] A visual pulse fast enough to be a seizure risk */
        pulse: FormattedText;
        /** [formatted] Notes far above or below a comfortable range */
        register: FormattedText;
        /** [formatted] More tracks playing at once than is comfortable to follow */
        tracks: FormattedText;
    };
};

export { type MusicSafetyTexts as default };

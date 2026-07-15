import type { FormattedText } from '@locale/LocaleText';
import type { HeaderAndExplanationText } from '@locale/UITexts';

/**
 * Text shown before a read-only project whose static analysis found visual
 * properties that may trigger photosensitive seizures or other neurological
 * stress. See {@link PhotosensitivityRisk}.
 */
export type PhotosensitivityTexts = {
    /** Header and explanation shown before the risky content plays. */
    warning: HeaderAndExplanationText;
    /** A description of each category of visual property that may be present. */
    categories: {
        /** [formatted] Rapid flashing or contrast changes (3–60 per second). */
        flashing: FormattedText;
        /** [formatted] Rapidly alternating strongly saturated red. */
        redflash: FormattedText;
        /** [formatted] Strobe-like flashing that fills the screen. */
        strobe: FormattedText;
        /** [formatted] Dense, highly contrasting geometric patterns. */
        pattern: FormattedText;
        /** [formatted] Very fast animation, especially opacity or scale changes. */
        motion: FormattedText;
    };
};

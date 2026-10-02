import DefaultLocale from '#locale/DefaultLocale.ts';
import Locales from '#locale/Locales.ts';
import concretize from '#locale/concretize.ts';

const DefaultLocales = new Locales(concretize, [DefaultLocale], DefaultLocale);

export { DefaultLocales as default };

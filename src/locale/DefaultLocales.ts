import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import concretize from '@locale/concretize';

const DefaultLocales = new Locales(concretize, [DefaultLocale], DefaultLocale);

export { DefaultLocales as default };

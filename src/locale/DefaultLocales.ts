import DefaultLocale from './DefaultLocale';
import Locales from './Locales';
import concretize from './concretize';

const DefaultLocales = new Locales(concretize, [DefaultLocale], DefaultLocale);

export { DefaultLocales as default };

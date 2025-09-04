import { MachineTranslated, Revised, Unwritten } from './LocaleText';

export function withoutAnnotations(name: string) {
    return name
        .replaceAll(Unwritten, '')
        .replaceAll(Revised, '')
        .replaceAll(MachineTranslated, '')
        .trim();
}

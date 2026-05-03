import { MachineTranslated, Revised, Unwritten } from '@locale/Annotations';

export function withoutAnnotations(name: string) {
    return name
        .replaceAll(Unwritten, '')
        .replaceAll(Revised, '')
        .replaceAll(MachineTranslated, '')
        .trim();
}

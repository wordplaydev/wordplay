import { writable } from 'svelte/store';
import { OR_SYMBOL } from '@parser/Symbols';
import { Latin, LatinCyrillicGreek, type Script } from '../locale/Scripts';
import type Locale from '../locale/Locale';

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontWeightRange = { min: FontWeight; max: FontWeight };

export type FontFormat = 'ttf' | 'otf' | 'woff2';

/** The data necessary for constructing @font-face load calls to load the font on demand. */
export type Face = {
    readonly weights: FontWeight[] | FontWeightRange; // Weights supported on the font
    readonly italic: boolean; // True if italics is supported on the weights above,
    readonly scripts: Readonly<Script[]>; // A list of ISO 15924 scripts supported,
    readonly format: FontFormat;
    readonly preloaded?: boolean; // True if the font is preloaded in app.html, and shouldn't be reloaded.
    readonly ranges?: string | string[]; // CSS unicode-range strings. Each index corrresponds to a different numbered file.
};

export type Font = {
    readonly name: SupportedFace;
    readonly weight: FontWeight;
    readonly italic: boolean;
    readonly format: FontFormat;
    /** CSS unicode-range string */
    readonly range: string | undefined;
};

export const loadedFonts = writable<Set<SupportedFace>>(new Set());

const Greek = 'U+0370-03FF';
const GreekExtended = 'U+1F00-1FFF';
const CyrillicExtended =
    'U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F';
const Cyrillic = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const Devangari =
    'U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FF';
const Vietnamese =
    'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB';
const LatinExtended =
    'U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF';
const LatinRange =
    'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

const NotoSans: Face = {
    weights: [300, 400, 700, 900],
    italic: true,
    scripts: LatinCyrillicGreek,
    ranges: [
        CyrillicExtended,
        Cyrillic,
        Devangari,
        GreekExtended,
        Greek,
        Vietnamese,
        LatinExtended,
        LatinRange,
    ],
    format: 'woff2',
};

const NotoEmoji: Face = {
    weights: [400],
    italic: false,
    scripts: ['Emoj'],
    // The WOFF2 files from Google don't work in Safari, so we just use the static 400 weight ttf.
    // ranges: [
    //     'U+1f1e6-1f1ff',
    //     'U+200d, U+2620, U+26a7, U+fe0f, U+1f308, U+1f38c, U+1f3c1, U+1f3f3-1f3f4, U+1f6a9, U+e0062-e0063, U+e0065, U+e0067, U+e006c, U+e006e, U+e0073-e0074, U+e0077, U+e007f',
    //     'U+23, U+2a, U+30-39, U+a9, U+ae, U+200d, U+203c, U+2049, U+20e3, U+2122, U+2139, U+2194-2199, U+21a9-21aa, U+23cf, U+23e9-23ef, U+23f8-23fa, U+24c2, U+25aa-25ab, U+25b6, U+25c0, U+25fb-25fe, U+2611, U+2622-2623, U+2626, U+262a, U+262e-262f, U+2638, U+2640, U+2642, U+2648-2653, U+2660, U+2663, U+2665-2666, U+2668, U+267b, U+267e-267f, U+2695, U+269b-269c, U+26a0, U+26a7, U+26aa-26ab, U+26ce, U+26d4, U+2705, U+2714, U+2716, U+271d, U+2721, U+2733-2734, U+2747, U+274c, U+274e, U+2753-2755, U+2757, U+2764, U+2795-2797, U+27a1, U+27b0, U+27bf, U+2934-2935, U+2b05-2b07, U+2b1b-2b1c, U+2b55, U+3030, U+303d, U+3297, U+3299, U+fe0f, U+1f170-1f171, U+1f17e-1f17f, U+1f18e, U+1f191-1f19a, U+1f201-1f202, U+1f21a, U+1f22f, U+1f232-1f23a, U+1f250-1f251, U+1f310, U+1f3a6, U+1f3b5-1f3b6, U+1f3bc, U+1f3e7, U+1f441, U+1f499-1f49c, U+1f49f-1f4a0, U+1f4a2, U+1f4ac-1f4ad, U+1f4b1-1f4b2, U+1f4b9, U+1f4db, U+1f4f2-1f4f6, U+1f500-1f50a, U+1f515, U+1f518-1f524, U+1f52f-1f53d, U+1f549, U+1f54e, U+1f5a4, U+1f5e8, U+1f5ef, U+1f6ab, U+1f6ad-1f6b1, U+1f6b3, U+1f6b7-1f6bc, U+1f6be, U+1f6c2-1f6c5, U+1f6d0-1f6d1, U+1f6d7, U+1f6dc, U+1f7e0-1f7eb, U+1f7f0, U+1f90d-1f90e, U+1f9e1, U+1fa75-1fa77, U+1faaf',
    //     'U+231a-231b, U+2328, U+23f0-23f3, U+2602, U+260e, U+2692, U+2694, U+2696-2697, U+2699, U+26b0-26b1, U+26cf, U+26d1, U+26d3, U+2702, U+2709, U+270f, U+2712, U+fe0f, U+1f302, U+1f321, U+1f392-1f393, U+1f3a9, U+1f3bd, U+1f3ee, U+1f3f7, U+1f3fa, U+1f451-1f462, U+1f484, U+1f489-1f48a, U+1f48c-1f48e, U+1f4a1, U+1f4a3, U+1f4b0, U+1f4b3-1f4b8, U+1f4bb-1f4da, U+1f4dc-1f4f1, U+1f4ff, U+1f50b-1f514, U+1f516-1f517, U+1f526-1f529, U+1f52c-1f52e, U+1f550-1f567, U+1f56f-1f570, U+1f576, U+1f587, U+1f58a-1f58d, U+1f5a5, U+1f5a8, U+1f5b1-1f5b2, U+1f5c2-1f5c4, U+1f5d1-1f5d3, U+1f5dc-1f5de, U+1f5e1, U+1f5f3, U+1f6aa, U+1f6ac, U+1f6bd, U+1f6bf, U+1f6c1, U+1f6cb, U+1f6cd-1f6cf, U+1f6d2, U+1f6e0-1f6e1, U+1f6f0, U+1f97b-1f97f, U+1f9af, U+1f9ba, U+1f9e2-1f9e6, U+1f9ea-1f9ec, U+1f9ee-1f9f4, U+1f9f7-1f9ff, U+1fa71-1fa74, U+1fa79-1fa7b, U+1fa86, U+1fa91-1fa93, U+1fa96, U+1fa99-1faa0, U+1faa2-1faa7, U+1faaa-1faae',
    //     'U+265f, U+26bd-26be, U+26f3, U+26f8, U+fe0f, U+1f004, U+1f0cf, U+1f380-1f384, U+1f386-1f38b, U+1f38d-1f391, U+1f396-1f397, U+1f399-1f39b, U+1f39e-1f39f, U+1f3a3-1f3a5, U+1f3a7-1f3a9, U+1f3ab-1f3b4, U+1f3b7-1f3bb, U+1f3bd-1f3c0, U+1f3c5-1f3c6, U+1f3c8-1f3c9, U+1f3cf-1f3d3, U+1f3f8-1f3f9, U+1f47e, U+1f4e2, U+1f4f7-1f4fd, U+1f52b, U+1f579, U+1f58c-1f58d, U+1f5bc, U+1f6f7, U+1f6f9, U+1f6fc, U+1f93f, U+1f941, U+1f945, U+1f947-1f94f, U+1f9e7-1f9e9, U+1f9f5-1f9f6, U+1fa70-1fa71, U+1fa80-1fa81, U+1fa83-1fa85, U+1fa87-1fa88, U+1fa94-1fa95, U+1fa97-1fa98, U+1faa1, U+1faa9',
    //     'U+2693, U+26e9-26ea, U+26f1-26f2, U+26f4-26f5, U+26fa, U+26fd, U+2708, U+fe0f, U+1f301, U+1f303, U+1f306-1f307, U+1f309, U+1f310, U+1f3a0-1f3a2, U+1f3aa, U+1f3cd-1f3ce, U+1f3d5, U+1f3d7-1f3db, U+1f3df-1f3e6, U+1f3e8-1f3ed, U+1f3ef-1f3f0, U+1f488, U+1f492, U+1f4ba, U+1f54b-1f54d, U+1f5fa-1f5ff, U+1f680-1f6a2, U+1f6a4-1f6a8, U+1f6b2, U+1f6d1, U+1f6d5-1f6d6, U+1f6dd-1f6df, U+1f6e2-1f6e5, U+1f6e9, U+1f6eb-1f6ec, U+1f6f3-1f6f6, U+1f6f8, U+1f6fa-1f6fb, U+1f9bc-1f9bd, U+1f9ed, U+1f9f3, U+1fa7c',
    //     'U+2615, U+fe0f, U+1f32d-1f330, U+1f336, U+1f33d, U+1f345-1f37f, U+1f382, U+1f52a, U+1f942-1f944, U+1f950-1f96f, U+1f99e, U+1f9aa, U+1f9c0-1f9cb, U+1fad0-1fadb',
    //     'U+200d, U+2600-2601, U+2603-2604, U+2614, U+2618, U+26a1, U+26c4-26c5, U+26c8, U+26f0, U+2728, U+2744, U+2b1b, U+2b50, U+fe0f, U+1f300, U+1f304-1f305, U+1f308, U+1f30a-1f30f, U+1f311-1f321, U+1f324-1f32c, U+1f331-1f335, U+1f337-1f33c, U+1f33e-1f344, U+1f3d4, U+1f3d6, U+1f3dc-1f3de, U+1f3f5, U+1f400-1f43f, U+1f490, U+1f4a7, U+1f4ab, U+1f4ae, U+1f525, U+1f54a, U+1f573, U+1f577-1f578, U+1f648-1f64a, U+1f940, U+1f980-1f9ae, U+1f9ba, U+1fa90, U+1faa8, U+1fab0-1fabd, U+1fabf, U+1face-1facf, U+1fae7',
    //     'U+200d, U+2640, U+2642, U+2695-2696, U+26f7, U+26f9, U+2708, U+2764, U+fe0f, U+1f33e, U+1f373, U+1f37c, U+1f384-1f385, U+1f393, U+1f3a4, U+1f3a8, U+1f3c2-1f3c4, U+1f3c7, U+1f3ca-1f3cc, U+1f3eb, U+1f3ed, U+1f3fb-1f3ff, U+1f466-1f478, U+1f47c, U+1f481-1f483, U+1f486-1f487, U+1f48b, U+1f48f, U+1f491, U+1f4bb-1f4bc, U+1f527, U+1f52c, U+1f574-1f575, U+1f57a, U+1f645-1f647, U+1f64b, U+1f64d-1f64e, U+1f680, U+1f692, U+1f6a3, U+1f6b4-1f6b6, U+1f6c0, U+1f6cc, U+1f91d, U+1f926, U+1f930-1f931, U+1f934-1f93a, U+1f93c-1f93e, U+1f977, U+1f9af-1f9b3, U+1f9b8-1f9b9, U+1f9bc-1f9bd, U+1f9cc-1f9cf, U+1f9d1-1f9df, U+1fa82, U+1fac3-1fac5',
    //     'U+200d, U+261d, U+2620, U+2639-263a, U+2665, U+270a-270d, U+2728, U+2763-2764, U+2b50, U+fe0f, U+1f31a-1f31f, U+1f32b, U+1f383, U+1f389, U+1f3fb-1f3ff, U+1f440-1f450, U+1f463-1f465, U+1f479-1f47b, U+1f47d-1f480, U+1f485, U+1f48b-1f48c, U+1f493-1f49f, U+1f4a4-1f4a6, U+1f4a8-1f4ab, U+1f4af, U+1f525, U+1f573, U+1f590, U+1f595-1f596, U+1f5a4, U+1f5e3, U+1f600-1f644, U+1f648-1f64a, U+1f64c, U+1f64f, U+1f90c-1f925, U+1f927-1f92f, U+1f932-1f933, U+1f970-1f976, U+1f978-1f97a, U+1f9a0, U+1f9b4-1f9b7, U+1f9bb, U+1f9be-1f9bf, U+1f9d0, U+1f9e0-1f9e1, U+1fa75-1fa79, U+1fac0-1fac2, U+1fae0-1fae6, U+1fae8, U+1faf0-1faf8',
    //     'U+200d, U+2194-2195, U+2640, U+2642, U+26d3, U+27a1, U+fe0f, U+1f344, U+1f34b, U+1f3c3, U+1f3fb-1f3ff, U+1f426, U+1f468-1f469, U+1f4a5, U+1f525, U+1f642, U+1f6b6, U+1f7e9, U+1f7eb, U+1f9af, U+1f9bc-1f9bd, U+1f9ce, U+1f9d1-1f9d2',
    // ],
    // format: 'woff2',
    format: 'woff2',
};

const NotoColorEmoji: Face = {
    weights: [400],
    italic: false,
    scripts: ['Emoj'],
    format: 'woff2',
    ranges: [
        'U+1f1e6-1f1ff',
        'U+200d, U+2620, U+26a7, U+fe0f, U+1f308, U+1f38c, U+1f3c1, U+1f3f3-1f3f4, U+1f6a9, U+e0062-e0063, U+e0065, U+e0067, U+e006c, U+e006e, U+e0073-e0074, U+e0077, U+e007f',
        'U+23, U+2a, U+30-39, U+a9, U+ae, U+200d, U+203c, U+2049, U+20e3, U+2122, U+2139, U+2194-2199, U+21a9-21aa, U+23cf, U+23e9-23ef, U+23f8-23fa, U+24c2, U+25aa-25ab, U+25b6, U+25c0, U+25fb-25fe, U+2611, U+2622-2623, U+2626, U+262a, U+262e-262f, U+2638, U+2640, U+2642, U+2648-2653, U+2660, U+2663, U+2665-2666, U+2668, U+267b, U+267e-267f, U+2695, U+269b-269c, U+26a0, U+26a7, U+26aa-26ab, U+26ce, U+26d4, U+2705, U+2714, U+2716, U+271d, U+2721, U+2733-2734, U+2747, U+274c, U+274e, U+2753-2755, U+2757, U+2764, U+2795-2797, U+27a1, U+27b0, U+27bf, U+2934-2935, U+2b05-2b07, U+2b1b-2b1c, U+2b55, U+3030, U+303d, U+3297, U+3299, U+fe0f, U+1f170-1f171, U+1f17e-1f17f, U+1f18e, U+1f191-1f19a, U+1f201-1f202, U+1f21a, U+1f22f, U+1f232-1f23a, U+1f250-1f251, U+1f310, U+1f3a6, U+1f3b5-1f3b6, U+1f3bc, U+1f3e7, U+1f441, U+1f499-1f49c, U+1f49f-1f4a0, U+1f4a2, U+1f4ac-1f4ad, U+1f4b1-1f4b2, U+1f4b9, U+1f4db, U+1f4f2-1f4f6, U+1f500-1f50a, U+1f515, U+1f518-1f524, U+1f52f-1f53d, U+1f549, U+1f54e, U+1f5a4, U+1f5e8, U+1f5ef, U+1f6ab, U+1f6ad-1f6b1, U+1f6b3, U+1f6b7-1f6bc, U+1f6be, U+1f6c2-1f6c5, U+1f6d0-1f6d1, U+1f6d7, U+1f6dc, U+1f7e0-1f7eb, U+1f7f0, U+1f90d-1f90e, U+1f9e1, U+1fa75-1fa77, U+1faaf',
        'U+231a-231b, U+2328, U+23f0-23f3, U+2602, U+260e, U+2692, U+2694, U+2696-2697, U+2699, U+26b0-26b1, U+26cf, U+26d1, U+26d3, U+2702, U+2709, U+270f, U+2712, U+fe0f, U+1f302, U+1f321, U+1f392-1f393, U+1f3a9, U+1f3bd, U+1f3ee, U+1f3f7, U+1f3fa, U+1f451-1f462, U+1f484, U+1f489-1f48a, U+1f48c-1f48e, U+1f4a1, U+1f4a3, U+1f4b0, U+1f4b3-1f4b8, U+1f4bb-1f4da, U+1f4dc-1f4f1, U+1f4ff, U+1f50b-1f514, U+1f516-1f517, U+1f526-1f529, U+1f52c-1f52e, U+1f550-1f567, U+1f56f-1f570, U+1f576, U+1f587, U+1f58a-1f58d, U+1f5a5, U+1f5a8, U+1f5b1-1f5b2, U+1f5c2-1f5c4, U+1f5d1-1f5d3, U+1f5dc-1f5de, U+1f5e1, U+1f5f3, U+1f6aa, U+1f6ac, U+1f6bd, U+1f6bf, U+1f6c1, U+1f6cb, U+1f6cd-1f6cf, U+1f6d2, U+1f6e0-1f6e1, U+1f6f0, U+1f97b-1f97f, U+1f9af, U+1f9ba, U+1f9e2-1f9e6, U+1f9ea-1f9ec, U+1f9ee-1f9f4, U+1f9f7-1f9ff, U+1fa71-1fa74, U+1fa79-1fa7b, U+1fa86, U+1fa91-1fa93, U+1fa96, U+1fa99-1faa0, U+1faa2-1faa7, U+1faaa-1faae',
        'U+265f, U+26bd-26be, U+26f3, U+26f8, U+fe0f, U+1f004, U+1f0cf, U+1f380-1f384, U+1f386-1f38b, U+1f38d-1f391, U+1f396-1f397, U+1f399-1f39b, U+1f39e-1f39f, U+1f3a3-1f3a5, U+1f3a7-1f3a9, U+1f3ab-1f3b4, U+1f3b7-1f3bb, U+1f3bd-1f3c0, U+1f3c5-1f3c6, U+1f3c8-1f3c9, U+1f3cf-1f3d3, U+1f3f8-1f3f9, U+1f47e, U+1f4e2, U+1f4f7-1f4fd, U+1f52b, U+1f579, U+1f58c-1f58d, U+1f5bc, U+1f6f7, U+1f6f9, U+1f6fc, U+1f93f, U+1f941, U+1f945, U+1f947-1f94f, U+1f9e7-1f9e9, U+1f9f5-1f9f6, U+1fa70-1fa71, U+1fa80-1fa81, U+1fa83-1fa85, U+1fa87-1fa88, U+1fa94-1fa95, U+1fa97-1fa98, U+1faa1, U+1faa9',
        'U+2693, U+26e9-26ea, U+26f1-26f2, U+26f4-26f5, U+26fa, U+26fd, U+2708, U+fe0f, U+1f301, U+1f303, U+1f306-1f307, U+1f309, U+1f310, U+1f3a0-1f3a2, U+1f3aa, U+1f3cd-1f3ce, U+1f3d5, U+1f3d7-1f3db, U+1f3df-1f3e6, U+1f3e8-1f3ed, U+1f3ef-1f3f0, U+1f488, U+1f492, U+1f4ba, U+1f54b-1f54d, U+1f5fa-1f5ff, U+1f680-1f6a2, U+1f6a4-1f6a8, U+1f6b2, U+1f6d1, U+1f6d5-1f6d6, U+1f6dd-1f6df, U+1f6e2-1f6e5, U+1f6e9, U+1f6eb-1f6ec, U+1f6f3-1f6f6, U+1f6f8, U+1f6fa-1f6fb, U+1f9bc-1f9bd, U+1f9ed, U+1f9f3, U+1fa7c',
        'U+2615, U+fe0f, U+1f32d-1f330, U+1f336, U+1f33d, U+1f345-1f37f, U+1f382, U+1f52a, U+1f942-1f944, U+1f950-1f96f, U+1f99e, U+1f9aa, U+1f9c0-1f9cb, U+1fad0-1fadb',
        'U+200d, U+2600-2601, U+2603-2604, U+2614, U+2618, U+26a1, U+26c4-26c5, U+26c8, U+26f0, U+2728, U+2744, U+2b1b, U+2b50, U+fe0f, U+1f300, U+1f304-1f305, U+1f308, U+1f30a-1f30f, U+1f311-1f321, U+1f324-1f32c, U+1f331-1f335, U+1f337-1f33c, U+1f33e-1f344, U+1f3d4, U+1f3d6, U+1f3dc-1f3de, U+1f3f5, U+1f400-1f43f, U+1f490, U+1f4a7, U+1f4ab, U+1f4ae, U+1f525, U+1f54a, U+1f573, U+1f577-1f578, U+1f648-1f64a, U+1f940, U+1f980-1f9ae, U+1f9ba, U+1fa90, U+1faa8, U+1fab0-1fabd, U+1fabf, U+1face-1facf, U+1fae7',
        'U+200d, U+2640, U+2642, U+2695-2696, U+26f7, U+26f9, U+2708, U+2764, U+fe0f, U+1f33e, U+1f373, U+1f37c, U+1f384-1f385, U+1f393, U+1f3a4, U+1f3a8, U+1f3c2-1f3c4, U+1f3c7, U+1f3ca-1f3cc, U+1f3eb, U+1f3ed, U+1f3fb-1f3ff, U+1f466-1f478, U+1f47c, U+1f481-1f483, U+1f486-1f487, U+1f48b, U+1f48f, U+1f491, U+1f4bb-1f4bc, U+1f527, U+1f52c, U+1f574-1f575, U+1f57a, U+1f645-1f647, U+1f64b, U+1f64d-1f64e, U+1f680, U+1f692, U+1f6a3, U+1f6b4-1f6b6, U+1f6c0, U+1f6cc, U+1f91d, U+1f926, U+1f930-1f931, U+1f934-1f93a, U+1f93c-1f93e, U+1f977, U+1f9af-1f9b3, U+1f9b8-1f9b9, U+1f9bc-1f9bd, U+1f9cc-1f9cf, U+1f9d1-1f9df, U+1fa82, U+1fac3-1fac5',
        'U+200d, U+261d, U+2620, U+2639-263a, U+2665, U+270a-270d, U+2728, U+2763-2764, U+2b50, U+fe0f, U+1f31a-1f31f, U+1f32b, U+1f383, U+1f389, U+1f3fb-1f3ff, U+1f440-1f450, U+1f463-1f465, U+1f479-1f47b, U+1f47d-1f480, U+1f485, U+1f48b-1f48c, U+1f493-1f49f, U+1f4a4-1f4a6, U+1f4a8-1f4ab, U+1f4af, U+1f525, U+1f573, U+1f590, U+1f595-1f596, U+1f5a4, U+1f5e3, U+1f600-1f644, U+1f648-1f64a, U+1f64c, U+1f64f, U+1f90c-1f925, U+1f927-1f92f, U+1f932-1f933, U+1f970-1f976, U+1f978-1f97a, U+1f9a0, U+1f9b4-1f9b7, U+1f9bb, U+1f9be-1f9bf, U+1f9d0, U+1f9e0-1f9e1, U+1fa75-1fa79, U+1fac0-1fac2, U+1fae0-1fae6, U+1fae8, U+1faf0-1faf8',
    ],
};

const NotoSansMono: Face = {
    weights: [400, 700],
    italic: false,
    scripts: LatinCyrillicGreek,
    format: 'woff2',
    ranges: [
        CyrillicExtended,
        Cyrillic,
        GreekExtended,
        Greek,
        Vietnamese,
        // Latin extended
        'U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF',
        LatinRange,
    ],
};

/**
 * A data structure that represents fonts that creators can use to style phrases.
 */
const Faces: Record<string, Face> = {
    'Noto Sans': NotoSans,
    'Noto Sans Japanese': {
        weights: { min: 100, max: 900 },
        italic: false,
        scripts: ['Jpan'],
        format: 'woff2',
    },
    'Noto Emoji': NotoEmoji,
    'Noto Color Emoji': NotoColorEmoji,
    'Noto Sans Simplified Chinese': {
        weights: [100, 300, 400, 500, 700, 900],
        italic: false,
        scripts: ['Hani'],
        format: 'otf',
    },
    'Noto Sans Mono': NotoSansMono,
    'Poor Story': {
        weights: [400],
        italic: false,
        scripts: ['Kore', 'Latn'],
        format: 'woff2',
    },
    'Permanent Marker': {
        weights: [400],
        italic: false,
        scripts: ['Latn'],
        format: 'woff2',
    },
    Borel: {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Roboto: {
        weights: [100, 300, 400, 500, 700, 900],
        italic: true,
        scripts: LatinCyrillicGreek,
        format: 'woff2',
    },
    Phudu: {
        weights: { min: 300, max: 900 },
        italic: false,
        scripts: ['Latn'],
        format: 'woff2',
    },
    Ubuntu: {
        weights: [300, 400, 500, 700],
        italic: true,
        scripts: LatinCyrillicGreek,
        format: 'woff2',
    },
    Quicksand: {
        weights: { min: 300, max: 700 },
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Pacifico: {
        weights: [400],
        italic: false,
        scripts: ['Latn', 'Cyrl'],
        format: 'woff2',
    },
    Caveat: {
        weights: { min: 400, max: 700 },
        italic: false,
        scripts: ['Latn', 'Cyrl'],
        format: 'woff2',
    },
    Arvo: {
        weights: [400, 700],
        italic: true,
        scripts: Latin,
        format: 'woff2',
    },
    'Shadows Into Light': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Play: {
        weights: [400, 700],
        italic: false,
        scripts: LatinCyrillicGreek,
        format: 'woff2',
    },
    'Passion One': {
        weights: [400, 700, 900],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    'Titan One': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    'Luckiest Guy': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Creepster: {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    'Special Elite': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Tangerine: {
        weights: [400, 700],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    'Carter One': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Monoton: {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Aclonica: {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
        ranges: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
    'Berkshire Swash': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    'Cabin Sketch': {
        weights: [400, 700],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    'Short Stack': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Graduate: {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Silkscreen: {
        weights: [400, 700],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    'Mouse Memoirs': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Megrim: {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Modak: {
        weights: [400],
        italic: false,
        scripts: ['Latn', 'Deva'],
        format: 'woff2',
    },
    'Sue Ellen Francisco': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    'Rampart One': {
        weights: [400],
        italic: false,
        scripts: ['Latn', 'Jpan'],
        format: 'woff2',
    },
    Codystar: {
        weights: [300, 400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    'Crafty Girls': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    Gorditas: {
        weights: [400, 700],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    'Ribeye Marrow': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
    'Bungee Outline': {
        weights: [400],
        italic: false,
        scripts: Latin,
        format: 'woff2',
    },
};

/** The font face names supported. To add one, carefully add metadata to Faces and files to /static/fonts/. */
export type SupportedFace = keyof typeof Faces;

/** A sorted list of font face names, used to generate drop downs for font choosers and union type definitions for font face inputs. */
export const SupportedFaces = Object.keys(Faces).sort();

/**
 * This data structure managers the fonts that have been loaded,
 * responds to requests to load more fonts, and provides notificiations of when they are loaded
 * */
export class FontManager {
    // All default fonts are loaded in app.html. We mark them as loaded below.
    readonly defaultFaces: SupportedFace[] = [
        'Noto Sans',
        'Noto Emoji',
        'Noto Sans Mono',
        'Noto Color Emoji',
    ];

    facesLoaded = new Map<SupportedFace, 'requested' | 'loaded' | 'failed'>();

    constructor() {
        // Mark these as loaded so we don't redundantly load them.
        for (const face of this.defaultFaces)
            this.facesLoaded.set(face, 'loaded');
    }

    /** Returns true if the given font spec appears in SupportedFonts */
    getSupportedFace(font: Font) {
        const candidate = Faces[font.name];
        return (
            // All of the requested weights are supported
            (Array.isArray(candidate.weights)
                ? candidate.weights.includes(font.weight)
                : font.weight >= candidate.weights.min &&
                  font.weight <= candidate.weights.max) &&
                // If italics are requested, they are available
                (font.italic === false || candidate.italic)
                ? candidate
                : undefined
        );
    }

    isFaceRequested(face: SupportedFace) {
        return this.facesLoaded.has(face);
    }

    isFaceLoaded(face: SupportedFace) {
        return (
            this.isFaceRequested(face) && document.fonts.check(`12px "${face}"`)
        );
    }

    loadLocales(locales: Locale[]) {
        for (const locale of locales) {
            this.loadFace(locale.ui.font.app);
            this.loadFace(locale.ui.font.code);
        }
    }

    async loadFace(name: SupportedFace) {
        const face = Faces[name];

        // If preloaded, don't load it.
        if (face.preloaded === true) return;

        if (this.facesLoaded.get(name) === 'loaded') return;

        // Mark the face requested.
        this.facesLoaded.set(name, 'requested');

        let promises: Promise<boolean>[] = [];
        if (face) {
            // Find the unicode ranges, if there are any.
            const ranges =
                face.ranges === undefined
                    ? undefined
                    : Array.isArray(face.ranges)
                    ? face.ranges
                    : [face.ranges];

            // If the face has specific weights, load all of the individual ways, split by the ranges specified.
            if (Array.isArray(face.weights)) {
                promises = [
                    ...promises,
                    ...this.loadWeights(
                        name,
                        face.weights,
                        false,
                        ranges,
                        face.format
                    ),
                ];
                if (face.italic)
                    promises = [
                        ...promises,
                        ...this.loadWeights(
                            name,
                            face.weights,
                            true,
                            ranges,
                            face.format
                        ),
                    ];
            }
            // If it's a variable weight font, load all of the range files.
            else {
                if (ranges === undefined)
                    promises.push(
                        this.loadFont({
                            name: name,
                            weight: face.weights.min,
                            italic: face.italic,
                            format: face.format,
                            range: undefined,
                        })
                    );
                else {
                    for (const range of ranges)
                        promises.push(
                            this.loadFont({
                                name: name,
                                weight: face.weights.min,
                                italic: face.italic,
                                format: face.format,
                                range: range,
                            })
                        );
                }
            }
        } else {
            this.facesLoaded.set(name, 'failed');
            return;
        }

        const loads = await Promise.all(promises);

        this.facesLoaded.set(
            name,
            loads.every((loaded) => loaded) ? 'loaded' : 'failed'
        );
    }

    loadWeights(
        name: string,
        weights: FontWeight[],
        ital: boolean,
        ranges: string[] | undefined,
        format: FontFormat
    ): Promise<boolean>[] {
        const promises: Promise<boolean>[] = [];
        for (const weight of weights) {
            if (ranges === undefined)
                promises.push(
                    this.loadFont({
                        name: name,
                        weight: weight,
                        italic: ital,
                        format: format,
                        range: undefined,
                    })
                );
            else {
                for (const range of ranges) {
                    promises.push(
                        this.loadFont({
                            name: name,
                            weight: weight,
                            italic: ital,
                            format: format,
                            range: range,
                        })
                    );
                }
            }
        }
        return promises;
    }

    async loadFont(font: Font): Promise<boolean> {
        // Don't try to add if not in a browser yet.
        if (typeof document === 'undefined' || typeof FontFace === 'undefined')
            return false;

        // See if we support this font
        const supportedFace = this.getSupportedFace(font);

        // If the requested font isn't supported, don't load it.
        if (supportedFace === undefined) {
            console.error(`${font.name} not supported`);
            return false;
        }

        // If there's a rannge, figure out of the index of the range.
        const rangeIndex =
            font.range && Array.isArray(supportedFace.ranges)
                ? supportedFace.ranges.indexOf(font.range)
                : undefined;

        // Otherwise, try loading it. Remove spaces.
        const spacelessFontName = font.name.replaceAll(' ', '');
        const fontFace = new FontFace(
            font.name,
            `url(/fonts/${spacelessFontName}/${spacelessFontName}-${
                Array.isArray(supportedFace.weights) ? font.weight : 'all'
            }${
                font.italic && Array.isArray(supportedFace.weights)
                    ? '-italic'
                    : ''
            }${rangeIndex !== undefined ? `-${rangeIndex}` : ''}.${
                supportedFace.format
            }`,
            {
                style: font.italic ? 'italic' : 'normal',
                weight: Array.isArray(supportedFace.weights)
                    ? font.weight.toString()
                    : `${supportedFace.weights.min} ${supportedFace.weights.max}`,
                unicodeRange: font.range,
            }
        );
        document.fonts.add(fontFace);

        this.facesLoaded.set(font.name, 'loaded');
        loadedFonts.set(new Set(this.facesLoaded.keys()));

        return true;
    }
}

const Fonts = new FontManager();
export default Fonts;

export const SupportedFontsFamiliesType = SupportedFaces.map(
    (font) => `"${font}"`
).join(OR_SYMBOL);

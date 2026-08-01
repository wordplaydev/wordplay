/**
 * Where the instrument recordings come from, and under what licence.
 *
 * The fonts pipeline records none of this — `fonts.manifest.ts` carries
 * rendering policy only, and its lockfile stores a self-hash of whatever is
 * on disk, so it attests "unchanged since someone ran fonts-fix", never
 * "authentic upstream artifact". That is survivable for ~200 OFL fonts from
 * one vendor. It is not survivable for audio drawn from several libraries
 * with heterogeneous, per-file licences, so every zone we ship records its
 * origin here and its upstream hash in the lockfile.
 *
 * We ship *derivatives* — trimmed, loudness-normalized, re-encoded — so the
 * licence has to permit that with no attribution chain and no share-alike:
 * hence CC0 only. That rules out MusyngKite and FatBoy (CC-BY-SA), and
 * FluidR3, whose licence is documented inconsistently (MIT in MuseScore's
 * tree, CC-BY 3.0 in midi-js-soundfonts' README) — an ambiguous licence on a
 * platform for schools is reason enough to go elsewhere.
 */

export type SourceLibrary = {
    /** Stable id, referenced by every zone in the manifest. */
    id: string;
    /** Human-readable name, for credits. */
    name: string;
    /** Who recorded it. */
    author: string;
    /** SPDX identifier. */
    license: string;
    /** Where the licence text lives in the distribution itself — checked by
     * `npm run instruments-download`, not taken on trust from a project page. */
    licenseUrl: string;
    /** Where the library is published. */
    homepage: string;
    /** How the fetcher reaches individual files. */
    delivery:
        | { kind: 'files'; base: string }
        | { kind: 'zip'; url: string; note: string };
};

export const Sources: Record<string, SourceLibrary> = {
    vcsl: {
        id: 'vcsl',
        name: 'Versilian Community Sample Library',
        author: 'Versilian Studios LLC and contributors',
        license: 'CC0-1.0',
        licenseUrl:
            'https://raw.githubusercontent.com/sgossner/VCSL/master/LICENSE',
        homepage: 'https://github.com/sgossner/VCSL',
        // Individual files over raw.githubusercontent, so regenerating pulls
        // the ~40 recordings we actually use rather than cloning 4 GB.
        delivery: {
            kind: 'files',
            base: 'https://raw.githubusercontent.com/sgossner/VCSL/master/',
        },
    },
    commons: {
        id: 'commons',
        name: 'Wikimedia Commons',
        // Per file, not per library: Commons hosts every licence there is, so
        // the manifest may only name files whose own page says CC0, and each
        // one's author is recorded in the lockfile. This is the source for
        // sounds no instrument library covers — an animal, not an instrument.
        author: 'various; recorded per zone in instruments.lock.json',
        license: 'CC0-1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        homepage: 'https://commons.wikimedia.org/',
        delivery: {
            kind: 'files',
            base: 'https://upload.wikimedia.org/wikipedia/commons/',
        },
    },
    vsco: {
        id: 'vsco',
        name: 'VSCO 2 Community Edition',
        author: 'Versilian Studios LLC',
        license: 'CC0-1.0',
        licenseUrl: 'https://versilian-studios.com/vsco-community/',
        homepage: 'https://versilian-studios.com/vsco-community/',
        // One 776 MB zip of Renoise instruments, each itself a zip of FLAC.
        // We range-request only the instruments we use (~60 MB), which is why
        // the fetcher speaks ZIP rather than shelling out to a downloader.
        delivery: {
            kind: 'zip',
            url: 'https://s3.amazonaws.com/VersilianStudios/VSCO-2.1-XRNI-20170216.zip',
            note: 'Renoise XRNI archive; entries are zips containing FLAC samples and an Instrument.xml.',
        },
    },
};

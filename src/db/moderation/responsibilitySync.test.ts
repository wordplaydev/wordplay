import type {
    ReportSubjectKind,
    Responsibility,
    Visibility,
} from 'shared-types';
import { expect, test } from 'vitest';
// The callable's own copy of the rule. `functions/` compiles with its own
// `rootDir` and can't import this side; this side can import it, which is what
// lets one table hold both to the same contract.
import getResponsibilityOnServer from '../../../functions/src/responsibility';
import reportIdOnServer from '../../../functions/src/reportId';
import getResponsibility from './responsibility';
import reportId from './reportId';

/** A private, ownerless-of-gallery starting point each case varies from. */
function visibility(over: Partial<Visibility> = {}): Visibility {
    return {
        public: false,
        gallery: null,
        galleryPublic: false,
        galleryMembers: [],
        owner: 'amy',
        ...over,
    };
}

const G = 'gallery-1';

/** Every shape of visibility the app can produce, and who answers for it. */
const cases: [string, Visibility, Responsibility][] = [
    // Nobody else can see it, so nobody moderates it. #819 rejected making
    // creators moderate their own work alone, and the rights page promises
    // private content is unmoderated.
    ['private and alone', visibility(), { kind: 'none' }],
    [
        'private, shared with named people, no gallery',
        visibility({ owner: 'amy' }),
        { kind: 'none' },
    ],

    // A gallery of one is a folder, not a space.
    [
        'a solo private gallery',
        visibility({ gallery: G, galleryMembers: ['amy'] }),
        { kind: 'none' },
    ],

    // Someone else is present, so its curators answer for it.
    [
        'a private gallery with others in it',
        visibility({ gallery: G, galleryMembers: ['amy', 'teacher'] }),
        { kind: 'curators', gallery: G },
    ],
    [
        'a private gallery the owner is not a member of',
        visibility({ gallery: G, galleryMembers: ['teacher'] }),
        { kind: 'curators', gallery: G },
    ],
    [
        'an unowned project in a solo gallery',
        visibility({ gallery: G, galleryMembers: ['teacher'], owner: null }),
        { kind: 'none' },
    ],

    // Public, with nobody standing between it and the world.
    ['public, no gallery', visibility({ public: true }), { kind: 'platform' }],

    // Both: platform-visible and curated. This is the case a four-way switch
    // gets wrong — a public project can sit inside a private gallery.
    [
        'public, in a private gallery with others',
        visibility({
            public: true,
            gallery: G,
            galleryMembers: ['amy', 'teacher'],
        }),
        { kind: 'both', gallery: G },
    ],
    [
        'in a public gallery',
        visibility({
            gallery: G,
            galleryPublic: true,
            galleryMembers: ['amy'],
        }),
        { kind: 'both', gallery: G },
    ],
    [
        'public, in a public gallery',
        visibility({
            public: true,
            gallery: G,
            galleryPublic: true,
            galleryMembers: ['amy', 'teacher'],
        }),
        { kind: 'both', gallery: G },
    ],
];

test.each(cases)(
    'both copies agree that %s',
    (_what, given, expected: Responsibility) => {
        // A drift between the two would let the client offer a report the
        // callable then refuses, or hide one it would have accepted, so it has
        // to fail here rather than in production.
        expect(getResponsibility(given)).toEqual(expected);
        expect(getResponsibilityOnServer(given)).toEqual(expected);
    },
);

test('a public gallery is curated however few people are in it', () => {
    // Being listed publicly is itself the reason curators answer for it, so the
    // others-test is skipped rather than applied and passed.
    const solo = visibility({
        gallery: G,
        galleryPublic: true,
        galleryMembers: [],
    });
    expect(getResponsibility(solo)).toEqual({ kind: 'both', gallery: G });
    expect(getResponsibilityOnServer(solo)).toEqual({
        kind: 'both',
        gallery: G,
    });
});

test('a duplicated member is still one person', () => {
    const duped = visibility({ gallery: G, galleryMembers: ['amy', 'amy'] });
    expect(getResponsibility(duped)).toEqual({ kind: 'none' });
    expect(getResponsibilityOnServer(duped)).toEqual({ kind: 'none' });
});

/** Every id the two sides can build for one subject. */
const ids: [ReportSubjectKind, string, string | undefined, string][] = [
    ['project', 'p1', undefined, 'project:p1'],
    ['gallery', 'g1', undefined, 'gallery:g1'],
    ['howto', 'h1', undefined, 'howto:h1'],
    // Both ids, because a message id is unique within its chat and nothing
    // makes it unique across chats.
    ['chat', 'c1', 'm1', 'chat:c1:m1'],
    // A chat report with no message names the conversation, not a message.
    ['chat', 'c1', undefined, 'chat:c1'],
];

test.each(ids)(
    'both copies build the same id for %s %s %s',
    (kind, subject, message, expected) => {
        // The id is what makes reporting the same thing twice add a reporter
        // rather than make a second report, so a drift here would quietly
        // reintroduce the duplicates #193's addDoc left behind.
        expect(reportId(kind, subject, message)).toBe(expected);
        expect(reportIdOnServer(kind, subject, message)).toBe(expected);
    },
);

test('two messages in one chat get two reports, and two chats never collide', () => {
    expect(reportId('chat', 'c1', 'm1')).not.toBe(reportId('chat', 'c1', 'm2'));
    expect(reportId('chat', 'c1', 'm1')).not.toBe(reportId('chat', 'c2', 'm1'));
});

// FUNCTION getLLMTranslations
/** Translate a project's strings with an LLM (Claude). The client's
 *  translateProjectContent handles the AST (names, docs, text) and sends the
 *  unique strings here; project context improves domain-appropriate word
 *  choices. Returns translations 1:1 with `texts`, or null on failure. */
export type GetLLMTranslationsInputs = {
    /** Source locale string, e.g. 'en-US'. */
    from: string;
    /** Target locale string, e.g. 'es-MX'. */
    to: string;
    /** The unique source strings to translate, in order. */
    texts: string[];
    /** Optional context for quality: a sample of the project's other names and
     *  docs so translations fit the project's domain. */
    projectContext?: { names?: string[]; docs?: string[] };
    /** The caller's IANA time zone, so the daily translation budget resets at
     *  the creator's own midnight. Advisory: the server only ever moves the
     *  budget's day key forward, so a spoofed zone can delay a reset but never
     *  buy an early one. Falls back to UTC when absent or unrecognized. */
    zone?: string;
};
export type GetLLMTranslationsOutput = string[] | null;

/** The `details` payload on a `resource-exhausted` rejection from a translation
 *  callable, so the client can show the meter and the wait rather than a generic
 *  failure. `resetsAt` is epoch milliseconds. */
export type TranslationBudgetDetails = {
    used: number;
    limit: number;
    resetsAt: number;
};

// FUNCTION analyzeLocalization
/** A glossary id + its localized word, plus that word's other written forms
 *  (plurals, conjugations, synonyms), for the literal-term check. */
export type GlossaryWord = { id: string; word: string; forms?: string[] };
/** A glossary term found written as literal prose, with a one-click fix that
 *  swaps the occurrence for a symbolic `@id` reference — or, when an inflected
 *  form matched, for a reference written with that form. (Shared shape; the
 *  client computes these live, the server returns them for PR review.) */
export type LiteralTermFinding = {
    term: string;
    id: string;
    suggestion: string;
};
/** Per-string quality analysis: reading level (#460) and glossary symbolization,
 *  plus an optional English back-translation for PR review. */
export type StringAnalysis = {
    /** The locale path of the analyzed string. */
    key: string;
    /** True if the string reads above a ~6th-grade level. */
    complex: boolean;
    /** One short English sentence on why / how to simplify, or '' if fine. */
    readingLevelNote: string;
    /** Genuine literal-glossary-term findings (LLM-judged). */
    literalTerms: LiteralTermFinding[];
    /** English back-translation, present only when requested (PR review). */
    backTranslation?: string;
};
/** Analyze locale strings for reading level + glossary symbolization. The
 *  caller supplies the locale's glossary words (submitLocalization: from the
 *  fetched locale JSON) so the core never imports from src/. Returns one
 *  analysis per input string, or null on failure. */
export type AnalyzeLocalizationInputs = {
    /** The locale being analyzed, e.g. 'es-MX'. */
    locale: string;
    /** The locale to back-translate into, e.g. 'en-US'. */
    sourceLocale: string;
    /** The strings to analyze, in order. */
    strings: { key: string; text: string }[];
    /** The locale's glossary words for the literal-term check (empty to skip). */
    glossary: GlossaryWord[];
    /** Whether to also produce an English back-translation per string. */
    backTranslate: boolean;
};
export type AnalyzeLocalizationOutput = StringAnalysis[] | null;

export type CreateClassInputs = {
    /** The uid of the teacher that should be the curator of the gallery created. */
    teacher: string;
    /** The name of the class */
    name: string;
    /** The description fo the class */
    description: string;
    /** Existing student uids to add */
    existing: string[];
    /** Information for the student accounts */
    students: {
        username: string;
        password: string;
        meta: string[];
    }[];
};

// FUNCTION createClass
export type CreateClassError = {
    kind: 'account' | 'limit' | 'generic';
    info: string;
};
export type CreateClassOutput = {
    /** The ID of the class created */
    classid: string | undefined;
    /** Any errors returned by the function */
    error: undefined | CreateClassError;
};

// FUNCTION moderateProject
/** One moderator decision recorded against a creator (#193). */
export type Strike = {
    /** The project that was reviewed. */
    project: string;
    /** Which guidelines it broke, by flag name. */
    flags: string[];
    /** The moderator who decided. */
    moderator: string;
    /** When, in epoch milliseconds. */
    time: number;
    /** The moderator's decision this came from, so a retry of that decision
     *  can't count twice. Absent on strikes recorded before decisions were
     *  identified; an absent one never matches a new decision, which is the
     *  safe direction. */
    decision?: string;
};

/**
 * A creator's moderation record, at `strikes/{uid}`.
 *
 * Server-written and client-readable, like `usage/{uid}` — a creator who could
 * write this could clear their own strikes. The client reads it to explain why
 * public sharing is unavailable and to raise the notification; enforcement
 * itself is the `banned` custom claim, which costs no document reads in the
 * security rules.
 */
export type Strikes = {
    v: 1;
    /** How many times this creator has been found to have broken the rules. */
    count: number;
    /** Each decision, oldest first. */
    strikes: Strike[];
    /** Whether they've lost the ability to make anything public. */
    banned: boolean;
    /** When that happened, in epoch milliseconds, or null if it hasn't. */
    bannedAt: number | null;
    /** Decisions a gallery's curator made about them, in a gallery that was
     *  public at the time (#938). Never counted, never a ban — see `Finding`.
     *  Absent on records written before curators could decide anything. */
    findings?: Finding[];
};

/** What `moderateProject` is called with. */
export type ModerateProjectInputs = {
    /** The project being decided on. */
    project: string;
    /** The flag states to write, by flag name. */
    flags: Record<string, boolean | null>;
    /** Whether this decision counts as a strike against the project's owner.
     *  False for a decision that clears a project, and for a report dismissed
     *  as unfounded. */
    strike: boolean;
    /** Identifies this decision, so submitting it twice warns its creator once.
     *  One per time a moderator is shown a project — kept across retries of the
     *  same submission, new when the project comes up for review again. */
    decision: string;
};

/** What it answers with: the owner's record after the decision, so the
 *  moderator sees the consequence they just caused. */
export type ModerateProjectOutput = {
    count: number;
    banned: boolean;
};

/**
 * How a gallery stands with the moderators (#1311). Mirrors the union in
 * src/db/galleries/Gallery.ts; the two are compared by
 * src/db/galleries/galleryModerationSync.test.ts.
 */
export type GalleryModeration =
    'unrequested' | 'pending' | 'approved' | 'denied';

/** What `moderateGallery` is called with. */
export type ModerateGalleryInputs = {
    /** The gallery being decided on. */
    gallery: string;
    /** Whether it may be listed publicly. */
    decision: 'approved' | 'denied';
    /** The flag states to write, by flag name. All false or null for a denial
     *  on quality grounds — a gallery can be too unfinished to list without
     *  breaking any rule, and only a rule broken withdraws `public`. */
    flags: Record<string, boolean | null>;
};

/** What it answers with, so the moderator sees what their decision did. */
export type ModerateGalleryOutput = {
    moderation: GalleryModeration;
    /** Whether the decision also withdrew the gallery's public sharing. */
    unpublished: boolean;
};

// RESPONSIBILITY (#938)
/** The kinds of thing a report can be about. */
export type ReportSubjectKind = 'project' | 'gallery' | 'chat' | 'howto';

/**
 * A moderatable thing's visibility, in the only terms responsibility depends
 * on. Deliberately plain data rather than a `Project`/`Gallery` wrapper, so the
 * callable can pass raw Firestore documents and the client can pass either.
 */
export type Visibility = {
    /** Whether the thing itself is readable by anyone. */
    public: boolean;
    /** The gallery it's in, or null. */
    gallery: string | null;
    /** Whether that gallery is publicly listed. False when `gallery` is null. */
    galleryPublic: boolean;
    /** Everyone who can see the gallery: curators ∪ creators. Empty when
     *  `gallery` is null. */
    galleryMembers: string[];
    /** Whose thing it is, or null for an unclaimed one. */
    owner: string | null;
};

/** Who reviews what's reported about a thing, derived from its visibility. */
export type Responsibility =
    | { kind: 'none' }
    | { kind: 'curators'; gallery: string }
    | { kind: 'both'; gallery: string }
    | { kind: 'platform' };

// FUNCTION report (#938)
/**
 * A request that someone responsible review a piece of content.
 *
 * One collection for every subject kind, because who reviews a thing is decided
 * by its visibility rather than by what kind of thing it is, and both dashboards
 * ask the same question of it. Written only by the `report` and `moderate`
 * callables through the Admin SDK: a reporter can't be trusted to say who may
 * review their report, and a chat report moves someone else's words out of the
 * chat document.
 */
export type SerializedReport = {
    v: 2;
    kind: ReportSubjectKind;
    /** The project, gallery, or how-to id. For a chat, the chat's id. */
    subject: string;
    /** Which message, when the subject is a chat. */
    message?: string;
    /** The gallery the subject was in when it was reported, or null. */
    gallery: string | null;
    /**
     * Who may review this: the responsible gallery's curators at report time.
     *
     * Denormalized, like `chats.participants` and `howtos.viewersFlat`, so the
     * read rule is an array-contains with no `get()` — a join here would spend
     * the per-query document-access budget that src/db/firestoreLimits.ts
     * describes, and a query over more galleries than the budget is denied
     * whole. It routes reads only: the `moderate` callable re-derives
     * responsibility from the subject's *current* visibility before allowing a
     * decision, so a stale list can mis-route but never mis-authorize.
     */
    moderators: string[];
    /** Whether Wordplay's moderators are also responsible for it. */
    platform: boolean;
    /** Who made the thing. Addresses the decision notice; never shown to a
     *  reporter. */
    author: string | null;
    /** Everyone who has asked for this review, deduplicated. Never leaves the
     *  server except to someone responsible. */
    reporters: string[];
    /** When it was first raised. The queue's sort key. */
    time: number;
    /**
     * A reported chat message's own text, moved here when it was reported.
     *
     * This is what makes "temporarily removed" true rather than a client-side
     * `{#if}` over words every participant can still read — and what lets
     * someone review a message in a private gallery without being given read
     * access to the conversation around it.
     */
    text?: string;
    /** True once the message has been kept: the takedown is spent, so a later
     *  report reopens the review without hiding it again. */
    kept?: boolean;
    /** Whether anyone still needs to look at it. */
    resolved: boolean;
    /** Whether the decision found it broke a rule. */
    upheld?: boolean;
    /** Who decided. */
    moderator?: string;
    /** When, in epoch milliseconds. */
    moderatedAt?: number;
    /** Which rules the decision found broken, by flag name. */
    flags?: Record<string, boolean | null>;
    /** What the decider said to the author. Never shown to a reporter: it may
     *  quote the content. */
    note?: string;
};

/** What `report` is called with. */
export type ReportInputs = {
    kind: ReportSubjectKind;
    subject: string;
    /** Required when `kind` is 'chat'. */
    message?: string;
};

/** What it answers with, so the reporter learns their report landed and who
 *  will see it. */
export type ReportOutput = {
    /** How many people have now asked for this review. */
    reporters: number;
    /** Who is responsible, so the client can say so rather than guess. */
    responsibility: Responsibility;
};

// NOTICES (#938)
/**
 * What a notice in a creator's inbox is about.
 *
 * The split is not "moderation versus everything else" — it is whether the
 * recipient can see the document the notice is about. A notice is **written**
 * when they cannot: a reporter may never read `reports`, so the outcome of
 * their report has to be delivered, which is the substance of #938. A notice is
 * **derived** when they can: an unread chat, a new how-to, and a gallery's
 * listing state are all readable from documents the client already syncs, so
 * writing those would put a per-user document write on the app's hottest path.
 * Only their dismissal is stored.
 */
export type WrittenNoticeKind =
    /** Someone asked for a review of something you are responsible for. */
    | 'review-requested'
    /** Something you made was reported. Never says who reported it. */
    | 'reported'
    /** Your report reached whoever is responsible. */
    | 'report-received'
    /** A decision was made about something you made. */
    | 'decision'
    /** A decision was made about something you reported. */
    | 'outcome';

export type DerivedNoticeKind =
    /** Unread messages in a conversation. */
    | 'chat-message'
    /** A how-to was published in a gallery you are in. */
    | 'howto-published'
    /** A gallery you curate was accepted for the public listing. */
    | 'gallery-listed'
    /** A gallery you curate was not accepted. */
    | 'gallery-denied'
    /** A moderator warned you about public content (#193). */
    | 'warning'
    /** A message in a chat you curate is awaiting review. */
    | 'review-needed';

export type NoticeKind = WrittenNoticeKind | DerivedNoticeKind;

/** What a notice points at, so its link is data rather than a chain of ifs. */
export type NoticeSubject = {
    kind: ReportSubjectKind;
    id: string;
    /** The gallery it's in, when the route needs one. */
    gallery: string | null;
    /** Which message, for a chat. */
    message?: string;
};

export type SerializedNotice = {
    /** Stable, so a retry writes once and a dismissal stays dismissed. */
    id: string;
    kind: NoticeKind;
    subject: NoticeSubject;
    /** A label captured when it was written — a project's name, a gallery's,
     *  a how-to's title. Captured rather than looked up because the thing may
     *  be gone, or unreadable, by the time this is read. */
    title: string;
    /** Epoch milliseconds. The one ordering for written and derived alike. */
    time: number;
    /** Which rules a decision found broken, by flag name. */
    flags?: string[];
    /** A moderator's note. Only ever on a notice to the author — a note written
     *  for them may quote the content, which a reporter must not see. */
    note?: string;
    /** Which warning this is, when a decision carried one. */
    count?: number;
};

/**
 * A creator's inbox, at `notices/{uid}`.
 *
 * One document rather than a subcollection: the entire access pattern is "read
 * all of mine", a subcollection would need its own rules block and index, and
 * this mirrors `strikes/{uid}` and `usage/{uid}`, which are the same shape of
 * server-written, self-readable record.
 */
export type SerializedNotices = {
    v: 1;
    /** Server-appended, newest last, capped at MAX_NOTICES. */
    notices: SerializedNotice[];
    /** Ids the reader has dismissed — derived ones too, which is what makes
     *  "clear" mean one thing for every kind and survive a device change. */
    dismissed: string[];
    /** When the bell was last opened; anything newer is unread. */
    readAt: number;
};

/** How many notices an inbox keeps. Older ones fall off the front, the way a
 *  chat trims its oldest messages: an inbox is a recent-events list, not an
 *  archive, and the document has a size limit either way. */
export const MAX_NOTICES = 100;

// FUNCTION moderate (#938)
/**
 * One decision recorded by a gallery's curator, on `strikes/{uid}.findings`.
 *
 * Deliberately content-free, and only ever recorded when the gallery was
 * *public*. A curator's decision is classroom management, not a platform
 * warning: it never changes `count`, never leads to a ban, and never carries
 * the text or the note, because exporting a private gallery's internal
 * moderation to the platform is not what a teacher removing a message means.
 * What it does is let a platform moderator see a pattern that spans galleries.
 */
export type Finding = {
    /** The gallery whose curator decided. */
    gallery: string;
    /** What kind of thing it was about. */
    kind: ReportSubjectKind;
    /** Which guidelines it broke, by flag name. */
    flags: string[];
    /** When, in epoch milliseconds. */
    time: number;
    /** The decision this came from, so a retry can't record it twice. */
    decision: string;
};

/** What `moderate` is called with. */
export type ModerateInputs = {
    kind: ReportSubjectKind;
    subject: string;
    /** Which message, when the subject is a chat. */
    message?: string;
    /** The flag states to write, by flag name. */
    flags: Record<string, boolean | null>;
    /** What the decider wants the author to know. Only ever delivered to the
     *  author: a note written for them may quote the content, which whoever
     *  reported it must not be shown. */
    note?: string;
    /** Galleries only: whether it may be listed publicly. */
    listing?: 'approved' | 'denied';
    /** Whether this counts as a warning. Honoured only from a platform
     *  moderator deciding something the platform is responsible for. */
    strike: boolean;
    /** Identifies this decision, so submitting it twice warns and notifies
     *  once. One per time a decider is shown a thing. */
    decision: string;
};

/** What it answers with, so the decider sees what they just caused. */
export type ModerateOutput = {
    /** The author's warning count after the decision. */
    count: number;
    /** Whether they have now lost public sharing. */
    banned: boolean;
    /** Who was responsible, as the server computed it. */
    responsibility: Responsibility;
};

// FUNCTION joinAccount
/** Create an account (#628). Exactly one of `password` and `email` is given: a
 *  password makes a username account whose auth email is synthesized, an email
 *  makes a link-only account. `region` and `birthdate` are used to derive when
 *  the creator may hold an email address and are then discarded — neither is
 *  ever stored, and neither may be logged. */
export type JoinAccountInputs = {
    /** The username being claimed, as typed. */
    username: string;
    /** ISO 3166 alpha-2 code. Discarded after deriving eligibility. */
    region: string;
    /** ISO 8601 date, YYYY-MM-DD. Discarded after deriving eligibility. */
    birthdate: string;
    password?: string;
    email?: string;
    /** BCP-47 code choosing the sign-in email's language. A code only — never
     *  copy, or the callable becomes a phishing relay. */
    locale?: string;
};
export type JoinAccountError =
    | 'username-taken'
    | 'username-invalid'
    | 'password-invalid'
    | 'email-invalid'
    | 'birthdate-invalid'
    | 'not-eligible'
    | 'throttled'
    | 'failed';
export type JoinAccountOutput = {
    /** The password path only: hand to signInWithCustomToken. */
    token?: string;
    /** The email path only. Always true when a link was requested, whether or
     *  not the address already had an account — this endpoint never says which. */
    sent?: boolean;
    error?: JoinAccountError;
};

// FUNCTION sendSigninLink
/** Email a sign-in link to an existing account (#628). */
export type SendSigninLinkInputs = { email: string; locale?: string };
/** Deliberately the same answer whether or not an account exists. */
export type SendSigninLinkOutput = {
    sent?: true;
    error?: 'throttled' | 'failed';
};

// FUNCTION usernameAvailable
/** Whether each name could be claimed. An invalid or retired name is false. */
export type UsernameAvailableInputs = { usernames: string[] };
export type UsernameAvailableOutput = Record<string, boolean>;

// FUNCTION claimUsername
/** Record a username for the signed-in creator, so they keep it across a change
 *  of sign-in method. Must run *before* an account's auth email moves off the
 *  synthesized one, since that is what the username would otherwise be derived
 *  from. */
export type ClaimUsernameInputs = { username: string };
export type ClaimUsernameOutput = {
    claimed?: true;
    error?: 'taken' | 'invalid' | 'held' | 'unauthenticated' | 'failed';
};

// FUNCTION findCreator
/** Resolve an email address or username to a uid, for adding a collaborator.
 *  The only place an address may be looked up; answers a uid and nothing else. */
export type FindCreatorInputs = { emailOrUsername: string };
export type FindCreatorOutput = { uid: string | null };

// FUNCTION switchToPassword
/** Move an account from signing in with an emailed link to signing in with a
 *  username and password (#628). Server-side because the destination address is
 *  the synthesized `@u.wordplay.dev` one, which no verification mail could ever
 *  reach — and which needs no verification, since it is derived from a username
 *  this creator already holds a reservation for. The opposite direction stays on
 *  the client, where verifyBeforeUpdateEmail proves the new address is theirs. */
export type SwitchToPasswordInputs = { password: string };
export type SwitchToPasswordOutput = {
    switched?: true;
    /** `no-username` means the creator has no handle yet, so there is no name
     *  to build an address from — the client must claim one first. */
    error?:
        | 'unauthenticated'
        | 'no-username'
        | 'password-invalid'
        | 'already-password'
        | 'failed';
};

// FUNCTION changeUsername
/** Change the signed-in creator's username. The old name stays reserved to them
 *  as an alias, so it keeps resolving and nobody else can take it. */
export type ChangeUsernameInputs = { username: string };
export type ChangeUsernameOutput = {
    changed?: true;
    error?: 'unauthenticated' | 'invalid' | 'taken' | 'failed';
};

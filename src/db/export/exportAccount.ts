import { Creator, CreatorCollection } from '@db/creators/CreatorDatabase';
import { getUsername, HandleCollection } from '@db/creators/handle.svelte';
import { StrikesCollection } from '@db/creators/strikes.svelte';
import { DB } from '@db/Database';
import { Domain } from '@db/Domains';
import { firestore } from '@db/firebase';
import { allLocaleEdits } from '@db/locales/LocalizationDexie';
import { NoticesCollection } from '@db/moderation/Notice';
import { isProxySession, proxyPrefix } from '@db/proxySession';
import { writeZip, ZipTooLarge } from '@util/zip';
import type { User } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    type DocumentData,
    type Firestore,
    type Query,
    type QueryFieldFilterConstraint,
} from 'firebase/firestore';
import type { ClaimName } from 'shared-types';
import type {
    AccountFacts,
    AccountSnapshot,
    CollectionStep,
    DeviceState,
    ExportStep,
    Gap,
    Related,
    RelatedKit,
    Relationship,
} from './AccountSnapshot';
import { buildArchive } from './archive';
import { archiveFolder } from './names';
import { buildReadme, type ReadmeText } from './readme';

/**
 * Gathers everything Wordplay holds about a creator and hands it back as a zip
 * (#152).
 *
 * This is the only file in `src/db/export` that knows Firestore exists, and
 * that is deliberate: `proxyExportConvention.test.ts` asks that any file here
 * which reads Firestore also consults `isProxySession`, and keeping the reads
 * in one place is what makes that satisfiable by construction rather than by
 * remembering.
 *
 * Nothing here is a cloud function. Every record a creator owns is already
 * readable by them under the security rules — `creators`, `handles`, `usage`,
 * `strikes` and `notices` are each `allow read: if request.auth.uid == uid`,
 * and every collection answers an owner-scoped query — so a callable would
 * duplicate every schema on the server, and cap the result at the 10MB a
 * callable may return, for nothing.
 */

/** What a press produces. A refusal is not a failure: it is the one thing the
 *  export declines to do, and it needs its own explanation. */
export type ExportResult =
    | {
          kind: 'exported';
          bytes: Uint8Array;
          name: string;
          count: number;
          gaps: Gap[];
      }
    | { kind: 'refused' }
    | { kind: 'failed'; reason: 'offline' | 'too-large' | 'unknown' };

/**
 * Told which step just finished and how much has been gathered so far.
 *
 * Both halves matter. A message naming only the running count says the same
 * thing twice whenever two collections in a row are empty, and an unchanged
 * announcement is one a screen reader does not repeat — so the export would
 * sound as though it had stopped.
 */
export type Progress = (step: ExportStep, collected: number) => void;

/** Server-written, self-readable, and keyed by the creator's own uid. Not a
 *  `Domain`: nothing syncs these, and only their owner ever reads them. */
const UsageCollection = 'usage';
const ClassesCollection = 'classes';
const FeedbackCollection = 'feedback';
const KitVersionsCollection = 'kitversions';

/** The claims worth reporting. A list rather than a derivation, since
 *  `ClaimName` is a type and a claim nobody has named is not this file's to
 *  invent a word for. */
const Claims: ClaimName[] = ['admin', 'mod', 'teacher', 'banned'];

/** One owner-scoped query and what it says about the creator's tie to what it
 *  returns. */
type Scoped = { relationship: Relationship; where: QueryFieldFilterConstraint };

/**
 * Reads every document these queries return, keeping each one exactly as
 * stored.
 *
 * Relationships accumulate rather than the last query winning: a creator is
 * very often both a curator and a creator of the same gallery, and an archive
 * that recorded only one of those would be telling them something false about
 * their own standing.
 */
async function relatedFrom(
    store: Firestore,
    name: string,
    scopes: Scoped[],
): Promise<Related[]> {
    const found = new Map<string, Related>();
    for (const scope of scopes) {
        const q: Query<DocumentData> = query(
            collection(store, name),
            scope.where,
        );
        const snapshot = await getDocs(q);
        for (const document of snapshot.docs) {
            const already = found.get(document.id);
            if (already === undefined)
                found.set(document.id, {
                    id: document.id,
                    data: document.data(),
                    relationships: [scope.relationship],
                });
            else if (!already.relationships.includes(scope.relationship))
                already.relationships.push(scope.relationship);
        }
    }
    return [...found.values()];
}

/** A server-written document keyed by the creator's own uid, or undefined when
 *  they have none — which for `strikes` is the overwhelmingly common case, and
 *  must stay distinguishable from an empty one. */
async function selfDocument(
    store: Firestore,
    name: string,
    uid: string,
): Promise<unknown | undefined> {
    const snapshot = await getDoc(doc(store, name, uid));
    return snapshot.exists() ? snapshot.data() : undefined;
}

/** What the auth record and the creator's own token say about them. */
async function accountFacts(user: User): Promise<AccountFacts> {
    let claims: string[] = [];
    try {
        const token = await user.getIdTokenResult();
        // As *stored*, never as implied: `admin` satisfies every `mod` and
        // `teacher` test, but an archive should say what is on the account
        // rather than what follows from it.
        claims = Claims.filter((claim) => token.claims[claim] === true);
    } catch {
        // A token that will not refresh is not worth losing an archive over.
    }
    return {
        uid: user.uid,
        // Never the address: an account that signs in with one is still shown
        // its username, like everybody else (#628).
        username: getUsername(user) ?? user.uid,
        character: user.displayName,
        usesUsername: Creator.isUsername(user.email ?? ''),
        emailVerified: user.emailVerified,
        providers: user.providerData.map((provider) => provider.providerId),
        created: user.metadata.creationTime ?? null,
        lastSignIn: user.metadata.lastSignInTime ?? null,
        claims,
    };
}

/** What this device holds that no cloud record does, which is what makes the
 *  archive's warning about it true. */
async function deviceState(): Promise<DeviceState> {
    const settings = Object.entries(DB.Settings.settings).map(
        ([key, setting]) => ({
            key,
            device: setting.device,
            value: setting.get(),
        }),
    );

    // Everything in localStorage that is not a setting: the per-device id the
    // CRDT signs edits with, and whether the locale prompt has been shown. Both
    // are read under `proxyPrefix()` because that is what their owners write
    // them under (#1313) — reading the bare names would find nothing and report
    // none, which for device-only state is a silent loss. `domainRequests` is
    // deliberately absent: it is shared between tabs on purpose, being a
    // per-device fetch budget rather than anything about who is signed in.
    const storage: Record<string, string> = {};
    if (typeof window !== 'undefined')
        for (const key of [
            `${proxyPrefix()}wordplay.writerID`,
            `${proxyPrefix()}localeAsked`,
        ])
            try {
                const value = window.localStorage.getItem(key);
                if (value !== null) storage[key] = value;
            } catch {
                // A browser refusing storage has nothing to contribute here.
            }

    const unsaved: { domain: string; id: string }[] = [];
    for (const domain of Object.values(Domain))
        for (const id of await DB.localDB.getDirty(domain))
            unsaved.push({ domain, id });

    return {
        settings,
        localizationEdits: await allLocaleEdits(),
        storage,
        unsaved,
    };
}

/** How many things an archive holds, which is what its finish line reports. */
export function countOf(snapshot: AccountSnapshot): number {
    return (
        snapshot.projects.length +
        snapshot.galleries.length +
        snapshot.characters.length +
        snapshot.howTos.length +
        snapshot.chats.length +
        snapshot.classes.length +
        snapshot.feedback.length +
        snapshot.kits.length
    );
}

/**
 * Everything Wordplay holds about this creator, as the bytes of a zip.
 *
 * Every collection is read inside its own attempt: a creator whose galleries
 * happen to fail should still receive their projects, their characters, and
 * everything else, with the archive saying plainly what is missing. All or
 * nothing is the design that hands someone nothing.
 */
export default async function exportAccount(
    user: User,
    text: ReadmeText,
    progress: Progress,
): Promise<ExportResult> {
    // An administrator looking at someone else's account holds a real token for
    // them, so the security rules would allow every read below — which is
    // exactly why the refusal has to be here. Looking at an account in order to
    // help with it is not the same as taking a copy of it away.
    if (isProxySession()) return { kind: 'refused' };

    const store = firestore;
    if (store === undefined) return { kind: 'failed', reason: 'offline' };

    const uid = user.uid;
    const gaps: Gap[] = [];
    let collected = 0;

    /** Runs one collection's reads, turning a failure into a gap rather than
     *  into the end of the export. */
    async function step<T>(
        name: CollectionStep,
        read: () => Promise<T>,
        empty: T,
    ): Promise<T> {
        let result = empty;
        try {
            // Through `DB.read` so an unreachable backend fails this collection
            // fast, and feeds the reachability banner, rather than hanging the
            // whole archive on one query.
            result = await DB.read(read());
        } catch (error) {
            gaps.push({
                collection: name,
                reason: error instanceof Error ? error.message : 'unknown',
            });
        }
        if (Array.isArray(result)) collected += result.length;
        progress(name, collected);
        return result;
    }

    /** One collection, read under each of the ways a creator may be tied to it.
     *  The constraints are the ones the sync layer already runs, so what an
     *  archive holds cannot drift from what the app shows. */
    const from = (name: string, ...scopes: Scoped[]) =>
        relatedFrom(store, name, scopes);
    const owns = (field: string, relationship: Relationship): Scoped => ({
        relationship,
        where: where(field, '==', uid),
    });
    const among = (field: string, relationship: Relationship): Scoped => ({
        relationship,
        where: where(field, 'array-contains', uid),
    });

    const account: AccountFacts = await accountFacts(user);
    const self = await step<AccountSnapshot['self']>(
        'account',
        async () => ({
            creator: await selfDocument(store, CreatorCollection, uid),
            handle: await selfDocument(store, HandleCollection, uid),
            usage: await selfDocument(store, UsageCollection, uid),
            strikes: await selfDocument(store, StrikesCollection, uid),
            notices: await selfDocument(store, NoticesCollection, uid),
        }),
        {},
    );

    const projects = await step(
        'projects',
        () =>
            from(
                Domain.Projects,
                owns('owner', 'owner'),
                among('collaborators', 'collaborator'),
                among('commenters', 'commenter'),
                among('viewers', 'viewer'),
            ),
        [],
    );

    const galleries = await step(
        'galleries',
        () =>
            from(
                Domain.Galleries,
                among('curators', 'curator'),
                among('creators', 'creator'),
            ),
        [],
    );

    const characters = await step(
        'characters',
        () =>
            from(
                Domain.Characters,
                owns('owner', 'owner'),
                among('collaborators', 'collaborator'),
            ),
        [],
    );

    const howTos = await step(
        'howtos',
        () =>
            from(
                Domain.HowTos,
                owns('creator', 'creator'),
                among('collaborators', 'collaborator'),
            ),
        [],
    );

    const chats = await step(
        'chats',
        () => from(Domain.Chats, among('participants', 'participant')),
        [],
    );

    const kits = await step<RelatedKit[]>(
        'kits',
        async () => {
            const owned = await from(Domain.Kits, owns('owner', 'owner'));
            // One query rather than a walk per kit: a published version carries
            // its owner denormalized precisely so a field test can answer this.
            const versions = await from(
                KitVersionsCollection,
                owns('owner', 'owner'),
            );
            return owned.map((kit) => ({
                kit,
                versions: versions.filter(
                    (version) =>
                        typeof version.data === 'object' &&
                        version.data !== null &&
                        Reflect.get(version.data, 'kit') === kit.id,
                ),
            }));
        },
        [],
    );

    const classes = await step(
        'classes',
        () =>
            from(
                ClassesCollection,
                among('teachers', 'teacher'),
                among('learners', 'learner'),
            ),
        [],
    );

    const feedback = await step(
        'feedback',
        () => from(FeedbackCollection, owns('creator', 'creator')),
        [],
    );

    const device = await step('device', deviceState, {
        settings: [],
        localizationEdits: [],
        storage: {},
        unsaved: [],
    });

    const snapshot: AccountSnapshot = {
        exportedAt: new Date().toISOString(),
        account,
        self,
        projects,
        galleries,
        characters,
        howTos,
        chats,
        classes,
        feedback,
        kits,
        device,
        gaps,
    };

    progress('archive', collected);

    try {
        const entries = buildArchive(snapshot, buildReadme(text, snapshot));
        const bytes = await writeZip(entries);
        progress('saving', collected);
        return {
            kind: 'exported',
            bytes,
            name: `${archiveFolder(account.username, snapshot.exportedAt)}.zip`,
            count: countOf(snapshot),
            gaps,
        };
    } catch (error) {
        return {
            kind: 'failed',
            reason: error instanceof ZipTooLarge ? 'too-large' : 'unknown',
        };
    }
}

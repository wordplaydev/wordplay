# Firestore Disaster-Recovery Runbook

How to recover Wordplay's Firestore data after a loss or corruption incident. Read
[the constraints](#constraints-that-shape-every-recovery) first — Firestore's recovery
model has sharp edges that make ad-hoc fixes dangerous.

Data-protection config (what you're recovering _from_) is codified in
[scripts/firestore-backups.sh](scripts/firestore-backups.sh) and summarized in
[ARCHITECTURE.md](ARCHITECTURE.md#server-side-backups). Backups live in GCP, not in
`firebase.json`.

## Recovery window at a glance

`wordplay-prod` protection (as of 2026-07-10):

| Mechanism | Granularity | Horizon |
| --- | --- | --- |
| **PITR** (point-in-time recovery) | any whole minute | last **7 days** |
| **Daily** backup schedule | one snapshot/day | last **7 days** |
| **Weekly** backup schedule (Sundays) | one snapshot/week | last **14 weeks** |

`wordplay-dev` has **no backups by design** — it has no recovery path.

Run this **first** in any incident to see exactly what you can recover to:

```bash
./scripts/firestore-restore.sh status
```

## Constraints that shape every recovery

1. **`import` overwrites/creates by document ID, but NEVER deletes.** It resurrects
   deleted docs and reverts corrupted ones, but cannot undo an accidental mass-_creation_
   (see [S6](#s6--malicious-or-buggy-mass-creation)) or remove docs added after the snapshot.
2. **Export/import granularity is the whole collection group, not the document.** Importing
   a `projects` snapshot reverts **every** project. To recover one user/project without
   rolling back everyone, import into a **scratch database** and copy only the affected docs
   with [scripts/firestore-recover-docs.ts](scripts/firestore-recover-docs.ts).
3. **`databases restore` creates a NEW database — it cannot overwrite `(default)`.** Total
   loss means restore→new DB, then repoint the app or re-import into a fresh default.
4. **Everything durable has a stable ID** (uuid4 or a derived key), so re-importing an old
   snapshot is idempotent — it overwrites the same doc, never duplicates. The one exception
   is the auto-ID `projects/{id}/updates` subcollection; **skip it** — the durable merged
   state is the parent project's `crdt` field. Never restore `presence/` either (ephemeral).

## Prerequisites

- `gcloud auth login` (for the shell toolkit) **and** `gcloud auth application-default login`
  (for the `.ts` copier — it uses Application Default Credentials).
- Roles on the project: **Cloud Datastore Import Export Admin** + **Cloud Datastore Owner**
  (or Firestore equivalents) and **Storage Admin**.
- The recovery bucket `gs://wordplay-prod-recovery` (US multi-region) — already created, with
  a 30-day object lifecycle and the Firestore service agent granted access.

## Decision tree

Identify the incident, then follow the matching scenario:

- Some docs **deleted** recently, blast radius bounded, you know roughly which → **[S1](#s1)** / **[S2](#s2)**
- Docs **corrupted in place** by a bad write/migration → **[S3](#s3)**
- The **whole database** is gone or wholesale-corrupted → **[S4](#s4)**
- You discovered it **more than 7 days** later → **[S5](#s5)**
- Someone/something **created** a flood of bad docs → **[S6](#s6)**

The general shape for anything surgical (S1–S3, S5) is always the same:

```
1. status                 # find a good timestamp / backup, confirm it's in-window
2. get a historical copy  # export-pitr  (minute-precise, <7d)   OR
                          # restore-backup (a daily/weekly snapshot) -> scratch DB
3. copy only what's hurt  # firestore-recover-docs.ts --confirm  (into (default))
4. verify, then drop-scratch
```

---

### S1 — Bounded recent deletion {#s1}

_Examples: a `purgeArchivedProjects` bug hard-deletes live projects; a curator deletes a
gallery and its how-tos; a user regrets a hard-delete._

Pick a PITR timestamp just **before** the deletion (whole minute, UTC, within 7 days), export
only the affected collection groups, import into a scratch DB, then copy the affected docs.

```bash
./scripts/firestore-restore.sh status
./scripts/firestore-restore.sh export-pitr 2026-07-10T07:59:00Z --collections projects,galleries,howtos,chats
./scripts/firestore-restore.sh make-scratch recovery-20260710
./scripts/firestore-restore.sh import gs://wordplay-prod-recovery/pitr-2026-07-10T07-59-00Z/ recovery-20260710

# Recover a specific gallery and everything under it (dry run first):
npx tsx scripts/firestore-recover-docs.ts --source recovery-20260710 --gallery <galleryId> --reconcile-refs
npx tsx scripts/firestore-recover-docs.ts --source recovery-20260710 --gallery <galleryId> --reconcile-refs --confirm

# Or specific documents by path:
npx tsx scripts/firestore-recover-docs.ts --source recovery-20260710 --docs projects/<id>,projects/<id2> --confirm

./scripts/firestore-restore.sh drop-scratch recovery-20260710
```

### S2 — One user's data gone {#s2}

_Example: `deleteAccount` removed all of a user's projects plus their `creators/{uid}` doc._

Same as S1, but select by owner. The copier pulls their projects and characters (and each
project's chat); recover the creator doc explicitly if needed.

```bash
npx tsx scripts/firestore-recover-docs.ts --source recovery-20260710 --owner <uid> --reconcile-refs           # dry run
npx tsx scripts/firestore-recover-docs.ts --source recovery-20260710 --owner <uid> --reconcile-refs --confirm
npx tsx scripts/firestore-recover-docs.ts --source recovery-20260710 --docs creators/<uid> --confirm          # if the profile was deleted
```

### S3 — Logical corruption in place {#s3}

_Examples: a bad project schema migration persisted a wrong shape over good docs; a bad
`compactProjectUpdates` merge wrote a corrupt `crdt` snapshot then deleted the source updates._

Export a PITR snapshot from **before the bad write**, import to a scratch DB, and copy the
affected docs. The copier's dry run lists which top-level fields differ per doc — review it
before `--confirm`. Caution: this reverts those docs to the snapshot time, so any _legitimate_
edits made after that time are lost; scope `--docs` as tightly as you can.

### S4 — Total database loss {#s4}

_Examples: the database is deleted, or a ransomware-style mass-overwrite corrupts it broadly._

```bash
./scripts/firestore-restore.sh status                                  # pick the newest good backup id
./scripts/firestore-restore.sh restore-backup <backupId> recovery-full # whole DB -> NEW database
```

Then choose:
- **Fastest:** repoint the app at `recovery-full` (a Firebase Web SDK `getFirestore(app, id)`
  change + redeploy), verify, and keep it as the new primary. `(default)` cannot be overwritten.
- **Keep `(default)`:** bulk-export `recovery-full` to the bucket and `import` it into a freshly
  recreated `(default)`. Higher downtime.

### S5 — Discovered more than 7 days later {#s5}

PITR and the daily backups are gone, but the **weekly** schedule retains 14 weeks. Restore the
most recent weekly backup that predates the incident into a scratch DB, then proceed as S1–S3.

```bash
./scripts/firestore-restore.sh status                                       # find a weekly backup in-window
./scripts/firestore-restore.sh restore-backup <weeklyBackupId> recovery-wk
npx tsx scripts/firestore-recover-docs.ts --source recovery-wk <selector> --confirm
```

Anything older than 14 weeks is unrecoverable.

### S6 — Malicious or buggy mass-creation {#s6}

Import cannot delete, so restoring a snapshot won't remove the bad docs. Instead, restore a
known-good snapshot into a scratch DB, diff it against `(default)` to find docs that exist in
prod but not in the good snapshot, and delete those from prod with a targeted admin script
(extend `firestore-recover-docs.ts` with a delete-diff mode, or do it inline). Never bulk-delete
without a reviewed dry-run list.

---

## Consistency checklist (after any partial recovery)

The copier handles the common cases, but verify:

- **project ↔ gallery** membership: `project.gallery` matches `gallery.projects[]`
  (`--reconcile-refs` adds these back via `arrayUnion`).
- **howto ↔ gallery**: `howto.galleryId` exists and is in `gallery.howTos[]`; a how-to whose
  gallery is missing becomes unreadable (security rules `get()` the gallery).
- **Flattened fields** normally maintained by Cloud Functions — `gallery.howToViewersFlat`,
  `howto.viewersFlat`, `gallery.words`. Copying a whole historical doc brings its own
  consistent copies; only worry if you hand-edited the source or copied a partial doc.
- **Skipped by design**: `projects/{id}/updates` and `projects/{id}/presence`. Durable project
  state is the parent `crdt` field; the updates are transient CRDT deltas.

## After recovering

1. Spot-check the recovered docs in the app (open a recovered project, load the gallery).
2. Re-run `./scripts/firestore-restore.sh status` and `drop-scratch` any scratch databases.
3. Note the incident, root cause, and the timestamp you recovered to.

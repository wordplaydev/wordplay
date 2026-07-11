#!/usr/bin/env bash
#
# Firestore disaster-recovery toolkit for Wordplay — the gcloud building blocks.
# See RECOVERY.md for the incident decision tree that sequences these subcommands.
#
# WHY A SCRATCH DATABASE: Firestore's `import` overwrites/creates by doc ID but
# NEVER deletes, and its granularity is the whole collection group — importing a
# snapshot of `projects` reverts EVERY project. So per-user / per-doc recovery is:
#   export-pitr (or restore-backup)  ->  a NEW scratch database  ->
#   scripts/firestore-recover-docs.ts copies only the affected docs into prod.
# This script never writes into a live (default) database except via the guarded
# `import --yes-default`, which you should essentially never use in prod.
#
# Requires: authenticated `gcloud` with Firestore + Storage admin on the project.
# Config via env: PROJECT (default wordplay-prod), BUCKET (default wordplay-prod-recovery).

set -euo pipefail

PROJECT="${PROJECT:-wordplay-prod}"
BUCKET="${BUCKET:-wordplay-prod-recovery}"
DATABASE='(default)'
LOCATION='nam5' # must match the (default) database + backups; scratch DBs use it too

die() { echo "error: $*" >&2; exit 1; }

confirm() {
  # $1 = prompt. Aborts unless the user types exactly "yes".
  local reply
  read -r -p "$1 [type 'yes' to proceed]: " reply
  [ "$reply" = "yes" ] || die "aborted."
}

usage() {
  cat >&2 <<EOF
Firestore recovery toolkit (project: ${PROJECT}, bucket: gs://${BUCKET})

Usage: PROJECT=$PROJECT $0 <command> [args]

  status
      Show the current recovery window: daily/weekly backup schedules, stored
      backups, and the earliest PITR timestamp. Run this FIRST in an incident.

  export-pitr <RFC3339-whole-minute> [--collections a,b,c]
      Export a point-in-time snapshot (within the 7-day PITR window) to
      gs://${BUCKET}/pitr-<ts>/. Optionally scope to collection groups.
      Example: $0 export-pitr 2026-07-10T08:00:00Z --collections projects,galleries

  make-scratch <db-id>
      Create an empty Firestore database (location ${LOCATION}) to import into.

  import <gcs-prefix> <db-id> [--yes-default]
      Import an export prefix (e.g. gs://${BUCKET}/pitr-.../ ) into database <db-id>.
      Refuses the (default) database unless --yes-default is given (almost never
      what you want in prod — recover into a scratch DB and copy selectively).

  restore-backup <backup-id> <scratch-db-id>
      Restore a whole daily/weekly BACKUP into a NEW scratch database. Use for
      total-loss (S4) or >7-day-old incidents (S5). Cannot overwrite (default).

  drop-scratch <db-id>
      Delete a scratch database once recovery is done. Guarded; never (default).

After you have a historical copy in a scratch DB, use:
  npx tsx scripts/firestore-recover-docs.ts --source <scratch-db-id> [filters] --confirm
to copy only the affected documents into the live (default) database.
EOF
  exit 1
}

cmd_status() {
  echo "==> Backup schedules (${PROJECT} / ${DATABASE}):"
  gcloud firestore backups schedules list --database="${DATABASE}" --project="${PROJECT}"
  echo
  echo "==> Stored backups:"
  gcloud firestore backups list --project="${PROJECT}"
  echo
  echo "==> PITR window (earliest recoverable timestamp):"
  gcloud firestore databases describe --database="${DATABASE}" --project="${PROJECT}" \
    --format='value(pointInTimeRecoveryEnablement,earliestVersionTime,versionRetentionPeriod)'
}

cmd_export_pitr() {
  local ts="${1:-}"; shift || true
  [ -n "$ts" ] || die "export-pitr needs an RFC3339 whole-minute timestamp (e.g. 2026-07-10T08:00:00Z)"
  local collections=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --collections) collections="${2:-}"; shift 2 ;;
      *) die "unknown flag: $1" ;;
    esac
  done
  local dest="gs://${BUCKET}/pitr-${ts//[:]/-}"
  echo "==> PITR export of ${PROJECT}/${DATABASE} @ ${ts}"
  echo "    destination: ${dest}"
  [ -n "$collections" ] && echo "    collections: ${collections}" || echo "    collections: ALL"
  confirm "Start PITR export"
  local args=(firestore export "$dest" --project="${PROJECT}" --database="${DATABASE}" --snapshot-time="${ts}")
  [ -n "$collections" ] && args+=(--collection-ids="${collections}")
  gcloud "${args[@]}"
  echo "==> Export started. Import target prefix will be: ${dest}/"
}

cmd_make_scratch() {
  local db="${1:-}"; [ -n "$db" ] || die "make-scratch needs a database id"
  [ "$db" != "(default)" ] || die "refusing to create (default)"
  echo "==> Creating scratch database '${db}' in ${PROJECT} (${LOCATION})"
  gcloud firestore databases create --database="${db}" --location="${LOCATION}" --project="${PROJECT}"
}

cmd_import() {
  local prefix="${1:-}" db="${2:-}"; shift 2 || true
  [ -n "$prefix" ] && [ -n "$db" ] || die "import needs <gcs-prefix> <db-id>"
  local yes_default=0
  [ "${1:-}" = "--yes-default" ] && yes_default=1
  if [ "$db" = "(default)" ] && [ "$yes_default" -ne 1 ]; then
    die "refusing to import into (default). Recover into a scratch DB and use firestore-recover-docs.ts, or pass --yes-default if you REALLY mean it."
  fi
  echo "==> Import ${prefix} -> ${PROJECT}/${db}"
  [ "$db" = "(default)" ] && echo "    !!! TARGET IS THE LIVE (default) DATABASE — overwrites docs by ID !!!"
  confirm "Start import into ${db}"
  gcloud firestore import "$prefix" --project="${PROJECT}" --database="${db}"
}

cmd_restore_backup() {
  local backup="${1:-}" db="${2:-}"
  [ -n "$backup" ] && [ -n "$db" ] || die "restore-backup needs <backup-id> <scratch-db-id>"
  [ "$db" != "(default)" ] || die "cannot restore over (default); choose a new scratch db id"
  # Accept either a bare backup id or a full resource path.
  local src="$backup"
  case "$backup" in
    projects/*) : ;;
    *) src="projects/${PROJECT}/locations/${LOCATION}/backups/${backup}" ;;
  esac
  echo "==> Restore backup ${src}"
  echo "    -> new database '${db}' in ${PROJECT}"
  confirm "Start restore"
  gcloud firestore databases restore --source-backup="${src}" --destination-database="${db}" --project="${PROJECT}"
}

cmd_drop_scratch() {
  local db="${1:-}"; [ -n "$db" ] || die "drop-scratch needs a database id"
  [ "$db" != "(default)" ] || die "refusing to delete (default)"
  echo "==> Deleting scratch database '${db}' from ${PROJECT}"
  confirm "Permanently DELETE database '${db}'"
  gcloud firestore databases delete --database="${db}" --project="${PROJECT}"
}

main() {
  local cmd="${1:-}"; shift || true
  case "$cmd" in
    status)         cmd_status "$@" ;;
    export-pitr)    cmd_export_pitr "$@" ;;
    make-scratch)   cmd_make_scratch "$@" ;;
    import)         cmd_import "$@" ;;
    restore-backup) cmd_restore_backup "$@" ;;
    drop-scratch)   cmd_drop_scratch "$@" ;;
    *)              usage ;;
  esac
}

main "$@"

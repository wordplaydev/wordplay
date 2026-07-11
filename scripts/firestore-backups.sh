#!/usr/bin/env bash
#
# Firestore data-protection config for Wordplay, as infrastructure-as-code.
#
# WHY THIS EXISTS: Firestore backup schedules and point-in-time recovery (PITR)
# CANNOT be expressed in firebase.json — the Firebase CLI has no backup config
# key — so they live in GCP, out of band from the rest of the repo. Reading the
# codebase alone wrongly suggests "no backups." This script documents the real
# configuration and can recreate it. It is NOT run automatically; the live
# source of truth is GCP. Re-run it only to (re)establish the config on a
# project, then verify with the read-only commands at the bottom.
#
# Requires: authenticated `gcloud` with Firestore admin on the target project.
# Usage:    ./scripts/firestore-backups.sh          # apply to prod (default)
#           PROJECT=wordplay-dev ./scripts/firestore-backups.sh   # target dev

set -euo pipefail

PROJECT="${PROJECT:-wordplay-prod}"
DATABASE='(default)'
DAILY_RETENTION='7d'   # fine-grained recent recovery (daily/weekly each max 14 weeks)
WEEKLY_RETENTION='14w' # long horizon for slow-to-detect incidents; runs Sundays

echo "==> Target project: ${PROJECT}, database: ${DATABASE}"

# A database allows at most one daily + one weekly schedule. We keep both: the
# daily gives 7 days of one-per-day snapshots for recent recovery, the weekly
# extends the horizon to 14 weeks. `schedules create` fails if that recurrence
# already exists, so guard each independently against the current list (which
# tags entries with `dailyRecurrence`/`weeklyRecurrence`).
SCHEDULES="$(gcloud firestore backups schedules list --database="${DATABASE}" --project="${PROJECT}" 2>/dev/null || true)"

# 1) Daily schedule (7-day retention). Mirrors the one created for prod 2023-10-14.
echo "==> Ensuring a daily backup schedule (retention ${DAILY_RETENTION})..."
if echo "${SCHEDULES}" | grep -q 'dailyRecurrence'; then
  echo "    A daily schedule already exists; leaving it as-is."
else
  gcloud firestore backups schedules create \
    --database="${DATABASE}" --project="${PROJECT}" \
    --recurrence=daily --retention="${DAILY_RETENTION}"
  echo "    Created daily backup schedule."
fi

# 2) Weekly schedule (14-week retention). Added for prod on 2026-07-10 to close
#    the 7-day-only horizon (PITR + daily both cap at 7 days).
echo "==> Ensuring a weekly backup schedule (retention ${WEEKLY_RETENTION}, Sundays)..."
if echo "${SCHEDULES}" | grep -q 'weeklyRecurrence'; then
  echo "    A weekly schedule already exists; leaving it as-is."
else
  gcloud firestore backups schedules create \
    --database="${DATABASE}" --project="${PROJECT}" \
    --recurrence=weekly --retention="${WEEKLY_RETENTION}" --day-of-week=SUN
  echo "    Created weekly backup schedule."
fi

# 3) Point-in-time recovery (PITR): continuous recovery to any minute in the
#    past 7 days. Enabled on wordplay-prod on 2026-07-10. NOTE: PITR storage is
#    billed (no free tier) — enable only on projects that warrant it. dev is
#    intentionally left WITHOUT PITR to avoid needless cost.
if [ "${PROJECT}" = "wordplay-prod" ]; then
  echo "==> Enabling point-in-time recovery (PITR)..."
  gcloud firestore databases update \
    --database="${DATABASE}" --project="${PROJECT}" --enable-pitr
else
  echo "==> Skipping PITR (only enabled on wordplay-prod by policy)."
fi

# --- Verify (read-only) -------------------------------------------------------
echo
echo "==> Current state:"
gcloud firestore backups schedules list --database="${DATABASE}" --project="${PROJECT}"
gcloud firestore databases describe --database="${DATABASE}" --project="${PROJECT}" \
  --format='value(pointInTimeRecoveryEnablement,versionRetentionPeriod)'
echo
echo "To list actual stored backups:  gcloud firestore backups list --project=${PROJECT}"

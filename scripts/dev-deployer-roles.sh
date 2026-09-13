#!/usr/bin/env bash
#
# Keep the wordplay-dev deploy service account's IAM roles identical to
# wordplay-prod's, as infrastructure-as-code.
#
# WHY THIS EXISTS: the test project only earns its keep if deploying to it
# predicts deploying to production, and that is false the moment the two
# deployers hold different permissions. The roles CANNOT be expressed in
# firebase.json, so they live in GCP, out of band from the rest of the repo —
# and they drifted: dev's account was created in 2023, never once used (zero
# audit-log entries in the 400-day window, because dev deploys were always run
# by hand under an owner account), and had accumulated roles/editor while
# missing seven roles prod relies on, including firebaserules.admin and the
# Eventarc permissions the Firestore-triggered functions need.
#
# Prod is the source of truth; this script reads both live policies and applies
# only the difference, so it is idempotent and safe to re-run. It is NOT run
# automatically. Pass --dry-run to see what it would change.
#
# Re-run it after changing prod's deploy roles, so dev follows.
set -euo pipefail

SA_NAME="github-action-510386416"
DEV_SA="${SA_NAME}@wordplay-dev.iam.gserviceaccount.com"
PROD_SA="${SA_NAME}@wordplay-prod.iam.gserviceaccount.com"
DRY_RUN="${1:-}"

roles_of() {
    gcloud projects get-iam-policy "$1" \
        --flatten="bindings[].members" \
        --filter="bindings.members:$2" \
        --format="value(bindings.role)" 2>/dev/null | sort -u
}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
roles_of wordplay-prod "$PROD_SA" > "$tmp/prod"
roles_of wordplay-dev "$DEV_SA" > "$tmp/dev"

# An empty read means no access or a wrong account, not "prod grants nothing".
# Without this guard that would strip every role dev has.
if [ ! -s "$tmp/prod" ]; then
    echo "Refusing to continue: read no roles for $PROD_SA." >&2
    exit 1
fi

to_add=$(comm -13 "$tmp/dev" "$tmp/prod")
to_remove=$(comm -23 "$tmp/dev" "$tmp/prod")

if [ -z "$to_add$to_remove" ]; then
    echo "Already identical: $(wc -l < "$tmp/dev" | tr -d ' ') roles."
    exit 0
fi

for role in $to_add; do
    echo "+ $role"
    [ "$DRY_RUN" = "--dry-run" ] && continue
    gcloud projects add-iam-policy-binding wordplay-dev \
        --member="serviceAccount:${DEV_SA}" --role="$role" \
        --condition=None --quiet > /dev/null
done

for role in $to_remove; do
    echo "- $role"
    [ "$DRY_RUN" = "--dry-run" ] && continue
    gcloud projects remove-iam-policy-binding wordplay-dev \
        --member="serviceAccount:${DEV_SA}" --role="$role" \
        --condition=None --quiet > /dev/null
done

[ "$DRY_RUN" = "--dry-run" ] && { echo "(dry run; nothing changed)"; exit 0; }

echo
echo "Verifying..."
roles_of wordplay-dev "$DEV_SA" > "$tmp/after"
if diff -q "$tmp/prod" "$tmp/after" > /dev/null; then
    echo "dev now matches prod exactly ($(wc -l < "$tmp/prod" | tr -d ' ') roles)."
else
    echo "STILL DIFFERENT (prod < > dev):"
    diff "$tmp/prod" "$tmp/after" || true
    exit 1
fi

# Verify by hand at any time:
#   ./scripts/dev-deployer-roles.sh --dry-run
# which prints nothing to change when the two projects agree.

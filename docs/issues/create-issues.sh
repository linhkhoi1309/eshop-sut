#!/usr/bin/env bash
# Create the 7 GitHub issues from the drafted body files.
# Prereqs: `gh auth login` (run it yourself in the terminal), and a repo remote (`gh repo view`).
# Run from the repo root:  bash docs/issues/create-issues.sh
#
# NOTE ON SCREENSHOTS (required by the assignment): gh cannot attach images. Either
#   (a) commit the PNGs under docs/evidence/ (the issue bodies already link them relatively), or
#   (b) after creating each issue, open it on github.com and drag the screenshot into it.
set -euo pipefail

# This repo is a fork, so gh defaults to the upstream parent. Pin everything to YOUR repo.
REPO="${ISSUE_REPO:-linhkhoi1309/eshop-sut}"

# 0) Ensure Issues are enabled on the target repo (requires admin; idempotent).
gh repo edit "$REPO" --enable-issues 2>/dev/null || true

# 1) Ensure labels exist (idempotent).
ensure_label () { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" 2>/dev/null || true; }
ensure_label "bug"                "d73a4a" "Confirmed defect vs README spec"
ensure_label "severity:critical"  "b60205" "Critical severity"
ensure_label "severity:high"      "e99695" "High severity"
ensure_label "severity:medium"    "fbca04" "Medium severity"
for f in FR-05 FR-09 FR-14 FR-10; do ensure_label "$f" "0e8a16" "Feature $f"; done

# 2) Create issues (title carries the [FR-xx] prefix; body from the drafted file).
gh issue create --repo "$REPO" --title "[FR-05] SQL injection & LIKE-wildcard leak in product search" \
  --label bug --label FR-05 --label severity:critical \
  --body-file docs/issues/bug-04.md

gh issue create --repo "$REPO" --title "[FR-09] Coupon rejected when order total exactly equals the minimum (> vs >=)" \
  --label bug --label FR-09 --label severity:high \
  --body-file docs/issues/bug-01.md

gh issue create --repo "$REPO" --title "[FR-09] Percent discount formula wrong -> negative discount / inflated total" \
  --label bug --label FR-09 --label severity:high \
  --body-file docs/issues/bug-02.md

gh issue create --repo "$REPO" --title "[FR-09] Coupon applies without login (C4 not enforced)" \
  --label bug --label FR-09 --label severity:high \
  --body-file docs/issues/bug-03.md

gh issue create --repo "$REPO" --title "[FR-14] Category write endpoints accept a non-admin token (SEC-03)" \
  --label bug --label FR-14 --label severity:high \
  --body-file docs/issues/bug-06.md

gh issue create --repo "$REPO" --title "[FR-10] Server lets a user cancel a shipping order (mobile UI masks it)" \
  --label bug --label FR-10 --label severity:high \
  --body-file docs/issues/bug-07.md

gh issue create --repo "$REPO" --title "[FR-14] Empty / whitespace category name accepted" \
  --label bug --label FR-14 --label severity:medium \
  --body-file docs/issues/bug-05.md

echo "Done. Paste each returned issue URL back into docs/bug-report.md (Issue column)."

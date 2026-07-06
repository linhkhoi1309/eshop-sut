#!/usr/bin/env bash
# Supplemental issues (BUG-08, BUG-09) — labels already created by create-issues.sh.
# Run from repo root:  bash docs/issues/create-issues-supp.sh
set -euo pipefail
REPO="${ISSUE_REPO:-linhkhoi1309/eshop-sut}"

gh issue create --repo "$REPO" --title "[FR-10] Admin can move a canceled order to delivered (final-state violation)" \
  --label bug --label FR-10 --label severity:high \
  --body-file docs/issues/bug-08.md

gh issue create --repo "$REPO" --title "[FR-14] Deleting a category orphans its products (integrity)" \
  --label bug --label FR-14 --label severity:medium \
  --body-file docs/issues/bug-09.md

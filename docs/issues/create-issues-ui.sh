#!/usr/bin/env bash
# UI issues (BUG-10, BUG-11) from manual verification. Labels already exist.
# Run from repo root:  bash docs/issues/create-issues-ui.sh
set -euo pipefail
REPO="${ISSUE_REPO:-linhkhoi1309/eshop-sut}"

gh issue create --repo "$REPO" --title "[FR-05] Reflected XSS in web search (dangerouslySetInnerHTML on search term)" \
  --label bug --label FR-05 --label severity:critical \
  --body-file docs/issues/bug-10.md

gh issue create --repo "$REPO" --title "[FR-05] Listing GUI non-compliance: two h1, empty alt, VND not ₫, no loading/empty state" \
  --label bug --label FR-05 --label severity:low \
  --body-file docs/issues/bug-11.md

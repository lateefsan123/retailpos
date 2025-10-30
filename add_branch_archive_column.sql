-- SQL migration: add is_archived soft-delete flag to branches

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_branches_is_archived ON branches (is_archived);

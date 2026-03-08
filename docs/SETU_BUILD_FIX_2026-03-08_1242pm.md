# SETU BUILD FIX — 2026-03-08 12:42 PM

## Issue
Vercel build failed in `src/components/people/PeopleDirectory.tsx` with:
- `Expression expected`
- syntax error near the `stripItems` memo block

## Root cause
A duplicate fragment of the `stripItems` `useMemo` body remained in the file after the previous hook-order patch. That left an extra `return [...]` / closing dependency array in normal component scope, which broke the TSX parser.

## Fix applied
- removed the stray duplicated `stripItems` block
- kept the valid `useMemo` declaration above all early returns so hook order remains stable

## Result
This resolves the exact PeopleDirectory syntax error from the 12:42 PM Vercel build log.

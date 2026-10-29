// Shared types and helpers for the Steps:: section ports (CCQ's
// app/lib/steps/*_section.rb), each of which decides which of its own step
// codes apply to a set of answers.
import type { Answers } from "../logic.js";

/**
 * A run of step codes handled together in CCQ's change-answers flow (port of
 * `Steps::Group`).
 */
export type Group = readonly string[];

/** One topic's steps and the order they apply in (port of a `Steps::*Section`). */
export interface Section {
  allSteps: readonly string[];
  groupedStepsFor: (answers: Answers) => Group[];
}

/**
 * Drops groups that do not apply, mirroring Ruby's `.compact` on an array of
 * optional `Steps::Group` values.
 * @param {ReadonlyArray<Group | undefined>} groups - groups, some possibly absent
 * @returns {Group[]} only the groups that apply
 */
export function compactGroups(
  groups: ReadonlyArray<Group | undefined>,
): Group[] {
  return groups.filter(
    (candidate): candidate is Group => candidate !== undefined,
  );
}

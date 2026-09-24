// Every problem says what failed and how to fix it, so the agent running the suite can act
export interface StartupProblem {
  area: string;
  cause: string;
  fix: string;
}

// Stable "E2E startup failed:" prefix so callers can search the output for it
export const formatStartupProblems = (title: string, problems: StartupProblem[]): string => {
  const items = problems.map(
    (problem, index) => `${index + 1}. [${problem.area}] ${problem.cause}\n   Fix: ${problem.fix}`,
  );
  return [`E2E startup failed: ${title}`, "", ...items, ""].join("\n");
};

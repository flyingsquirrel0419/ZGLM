export function planTask(userInput: string): string[] {
  const input = userInput.toLowerCase();
  const steps: string[] = [];

  const hasFileOperation =
    /\b(create|write|read|edit|modify|update|delete|remove)\b.*\b(file|files)\b/.test(
      input,
    ) ||
    /\.(ts|js|py|json|md|yaml|yml|toml)\b/.test(input);

  const hasSearch = /\b(search|find|look\s+for|locate)\b/.test(input);
  const hasInstall = /\b(install|add|setup)\b/.test(input);
  const hasTest = /\b(test|spec|verify|check)\b/.test(input);
  const hasRun = /\b(run|execute|start|launch)\b/.test(input);
  const hasDebug = /\b(debug|fix|solve|resolve|troubleshoot)\b/.test(input);
  const hasBuild = /\b(build|compile|bundle|pack)\b/.test(input);

  if (hasSearch) {
    steps.push('Search for relevant files and context');
  }

  if (hasDebug) {
    steps.push('Read and analyze the relevant source code');
    steps.push('Identify the root cause of the issue');
    steps.push('Implement the fix');
    steps.push('Verify the fix resolves the issue');
  } else if (hasFileOperation) {
    steps.push('Read existing files to understand the codebase');
    steps.push('Plan the changes needed');
    steps.push('Implement the file modifications');
    steps.push('Verify the changes are correct');
  }

  if (hasInstall) {
    steps.push('Install required dependencies');
    steps.push('Verify installation succeeded');
  }

  if (hasBuild) {
    steps.push('Build the project');
    steps.push('Check for build errors');
  }

  if (hasTest) {
    steps.push('Run the test suite');
    steps.push('Review test results and fix failures');
  }

  if (hasRun) {
    steps.push('Execute the required command');
    steps.push('Verify the output');
  }

  if (steps.length === 0) {
    steps.push('Analyze the request');
    steps.push('Gather relevant context');
    steps.push('Execute the task');
    steps.push('Verify the result');
  }

  return steps;
}

import chalk from 'chalk';

export function renderMarkdown(text: string): string {
  let result = text;

  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang: string, code: string) => {
    const trimmed = code.replace(/\n$/, '');
    return '\n' + chalk.bgGray.black(' ' + trimmed.split('\n').join(' ')) + '\n' +
      trimmed
        .split('\n')
        .map((line: string) => chalk.gray('│ ') + chalk.cyan(line))
        .join('\n') + '\n';
  });

  result = result.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    return chalk.bgGray.black(` ${code} `);
  });

  result = result.replace(/\*\*\*([^*\n]+)\*\*\*/g, (_match, text: string) => {
    return chalk.bold.italic(text);
  });

  result = result.replace(/\*\*([^*\n]+)\*\*/g, (_match, text: string) => {
    return chalk.bold(text);
  });

  result = result.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, (_match, text: string) => {
    return chalk.italic(text);
  });

  result = result.replace(/^### (.+)$/gm, (_match, text: string) => {
    return chalk.bold.yellow(`### ${text}`);
  });

  result = result.replace(/^## (.+)$/gm, (_match, text: string) => {
    return chalk.bold.yellowBright(`## ${text}`);
  });

  result = result.replace(/^# (.+)$/gm, (_match, text: string) => {
    return chalk.bold.underline.yellowBright(`# ${text}`);
  });

  result = result.replace(/^\s*[-*] (.+)$/gm, (_match, text: string) => {
    return chalk.gray('  • ') + text;
  });

  result = result.replace(/^\s*\d+\. (.+)$/gm, (_match, text: string) => {
    return chalk.gray('  ◦ ') + text;
  });

  result = result.replace(/^> (.+)$/gm, (_match, text: string) => {
    return chalk.gray('│ ') + chalk.dim(text);
  });

  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
    return chalk.blue.underline(label) + chalk.gray(` (${url})`);
  });

  result = result.replace(/^---$/gm, chalk.gray('─'.repeat(40)));

  return result;
}

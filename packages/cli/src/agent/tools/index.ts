import type { Tool } from '@zglm/shared';
import { executeBash } from './bash.js';
import { executeRead } from './read.js';
import { executeWrite } from './write.js';
import { executeSearch } from './search.js';
import { executePatch } from './patch.js';
async function executeListDirectory(args: Record<string, unknown>): Promise<string> {
  const { readdir, stat } = await import('node:fs/promises');
  const { resolve, join } = await import('node:path');
  const dirPath = resolve((args.path as string) ?? '.');
  const recursive = (args.recursive as boolean) ?? false;
  const includeHidden = (args.include_hidden as boolean) ?? false;

  async function listDir(currentPath: string, prefix: string): Promise<string[]> {
    const entries = await readdir(currentPath, { withFileTypes: true });
    const filtered = includeHidden
      ? entries
      : entries.filter((e) => !e.name.startsWith('.'));
    const results: string[] = [];

    for (const entry of filtered) {
      const fullPath = join(currentPath, entry.name);
      const display = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        results.push(`${display}/`);
        if (recursive) {
          const sub = await listDir(fullPath, display);
          results.push(...sub);
        }
      } else {
        try {
          const s = await stat(fullPath);
          results.push(`${display} (${s.size} bytes)`);
        } catch {
          results.push(display);
        }
      }
    }

    return results;
  }

  try {
    const items = await listDir(dirPath, '');
    return items.join('\n') || '(empty directory)';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error listing directory: ${message}`;
  }
}

async function executeSearchFiles(args: Record<string, unknown>): Promise<string> {
  const { readdir, readFile } = await import('node:fs/promises');
  const { resolve, join } = await import('node:path');
  const pattern = args.pattern as string;
  const searchPath = resolve((args.path as string) ?? '.');
  const filePattern = args.file_pattern as string | undefined;
  const caseSensitive = (args.case_sensitive as boolean) ?? false;

  const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  const results: string[] = [];
  const fileRegex = filePattern ? new RegExp(filePattern.replace(/\*/g, '.*')) : null;

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = join(currentPath, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (fileRegex && !fileRegex.test(entry.name)) continue;

        try {
          const content = await readFile(fullPath, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              results.push(`${fullPath}:${i + 1}: ${lines[i].trim()}`);
              if (results.length >= 50) return;
            }
            regex.lastIndex = 0;
          }
        } catch {
          continue;
        }
      }
    }
  }

  try {
    await walk(searchPath);
    return results.join('\n') || 'No matches found';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error searching files: ${message}`;
  }
}

export const BUILTIN_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'bash',
      description:
        'Execute a shell command and return its output. Use this tool to run CLI commands, install packages, build projects, run tests, or perform any shell operation.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds (default 30000, max 120000)',
          },
          cwd: {
            type: 'string',
            description: 'Working directory for the command',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Read the contents of a file. Returns line-numbered output with optional line range filtering.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read',
          },
          start_line: {
            type: 'number',
            description: 'Starting line number (1-indexed)',
          },
          end_line: {
            type: 'number',
            description: 'Ending line number (inclusive)',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description:
        'Write content to a file. Supports create, overwrite, and append modes. Creates parent directories automatically.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
          mode: {
            type: 'string',
            enum: ['create', 'overwrite', 'append'],
            description:
              "Write mode: 'create' fails if file exists, 'overwrite' replaces, 'append' adds to end",
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'patch_file',
      description:
        'Apply a unified diff patch to a file. The patch must be in standard unified diff format with @@ hunk headers.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to patch',
          },
          patch: {
            type: 'string',
            description: 'Unified diff content to apply',
          },
        },
        required: ['path', 'patch'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description:
        'List contents of a directory. Shows files and subdirectories with optional recursion and hidden file display.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list (defaults to current directory)',
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to list subdirectories recursively',
          },
          include_hidden: {
            type: 'boolean',
            description: 'Whether to include hidden files (starting with .)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description:
        'Search for a regex pattern across files in a directory. Returns matching lines with file paths and line numbers.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Regex pattern to search for',
          },
          path: {
            type: 'string',
            description: 'Directory to search in (defaults to current directory)',
          },
          file_pattern: {
            type: 'string',
            description: 'Glob pattern to filter files (e.g. "*.ts")',
          },
          case_sensitive: {
            type: 'boolean',
            description: 'Whether the search should be case sensitive',
          },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Search the web for information using Z.ai web search. Returns relevant results with summaries. Use this tool when you need current information, facts, news, or data that may not be in your training data.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query string',
          },
          count: {
            type: 'number',
            description: 'Number of results to return (default 5)',
          },
        },
        required: ['query'],
      },
    },
  },
];

export const TOOL_HANDLERS: Record<
  string,
  (args: Record<string, unknown>) => Promise<string>
> = {
  bash: async (args) =>
    executeBash({
      command: args.command as string,
      timeout: args.timeout as number | undefined,
      cwd: args.cwd as string | undefined,
    }),
  read_file: async (args) =>
    executeRead({
      path: args.path as string,
      start_line: args.start_line as number | undefined,
      end_line: args.end_line as number | undefined,
    }),
  write_file: async (args) =>
    executeWrite({
      path: args.path as string,
      content: args.content as string,
      mode: args.mode as string | undefined,
    }),
  patch_file: async (args) =>
    executePatch({
      path: args.path as string,
      patch: args.patch as string,
    }),
  list_directory: executeListDirectory,
  search_files: executeSearchFiles,
  search: async (args) =>
    executeSearch({
      query: args.query as string,
    }),
  web_search: async (args) =>
    executeSearch({
      query: args.query as string,
      count: args.count as number | undefined,
    }),
};

export { executeBash } from './bash.js';
export { executeRead } from './read.js';
export { executeWrite } from './write.js';
export { executeSearch } from './search.js';
export { executePatch } from './patch.js';

import { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { startInteractive } from './app.js';
import { loadConfig } from './config/loader.js';
import { getApiKey } from './utils/keychain.js';
import { performUninstall } from './install/paths.js';
import { version } from './version.js';

const program = new Command();

program
  .name('zglm')
  .description('Z.ai GLM Agentic CLI — GLM to the terminal')
  .version(version)
  .option('-m, --model <model>', 'Model to use', 'glm-4.6')
  .option('--think', 'Enable thinking mode')
  .option('--no-think', 'Disable thinking mode')
  .option('--add <files...>', 'Add files to context')
  .option('--continue', 'Continue last session')
  .option('--session <id>', 'Load specific session')
  .option('--uninstall <confirm>', 'Remove the installed ZGLM bundle (requires: confirm)')
  .option('--debug', 'Enable debug mode')
  .option('--verbose', 'Enable verbose output')
  .action(async (options) => {
    if (options.uninstall !== undefined) {
      try {
        const removed = await performUninstall({
          confirmation: options.uninstall,
        });
        if (removed) {
          console.log('ZGLM was uninstalled from this user account.');
        } else {
          console.log('No managed ZGLM installation metadata was found.');
        }
        process.exit(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Uninstall failed: ${message}`);
        process.exit(1);
      }
    }

    const config = await loadConfig();

    if (options.model) {
      config.core.defaultModel = options.model;
      config.model.default = options.model;
    }

    if (options.debug) {
      process.env.ZGLM_DEBUG = 'true';
    }

    if (options.think === true) {
      config.model.thinking = 'on';
    } else if (options.think === false) {
      config.model.thinking = 'off';
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      console.error('Error: Z.ai API key not found.');
      console.error('Set it via: export ZGLM_API_KEY=your-key');
      console.error('Or run: zglm init');
      process.exit(1);
    }

    await startInteractive({
      config,
      apiKey,
      initialModel: config.core.defaultModel,
      attachFiles: options.add ?? [],
      continueSession: options.continue ?? false,
      sessionId: options.session,
    });
  });

program
  .command('init')
  .description('Initialize ZGLM configuration')
  .action(async () => {
    const configDir = resolve(process.env.HOME ?? '~', '.config', 'zglm');
    if (!existsSync(configDir)) {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(configDir, { recursive: true });
    }
    console.log('ZGLM configuration initialized.');
    console.log(`Config directory: ${configDir}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Set your API key: export ZGLM_API_KEY=your-key');
    console.log('  2. Run: zglm');
  });

program
  .command('run <prompt>')
  .description('Run a single prompt without interactive mode')
  .option('-m, --model <model>', 'Model to use')
  .option('-f, --file <file>', 'Attach file to context', (val, prev: string[] = []) => [...prev, val], [])
  .option('--think', 'Enable thinking mode')
  .action(async (_prompt, _options) => {
    console.error('Single-shot mode is not yet implemented. Use interactive mode: zglm');
    process.exit(1);
  });

program.parse();

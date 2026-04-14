import type { Command } from '../types.js';

export const clearCommand: Command = {
  name: 'clear',
  aliases: ['cls', 'c'],
  description: 'Clear the terminal screen',
  usage: '/clear',
  async handler(_args, ctx) {
    ctx.output('\x1B[2J\x1B[H');
    return { success: true };
  },
};

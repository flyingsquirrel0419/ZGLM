import { createContext, useContext } from 'react';
import type { Theme, ThemeName, ThemeColors, ThemeIcons } from '@zglm/shared';

const defaultIcons: ThemeIcons = {
  user: '▷',
  ai: '⬡',
  thinking: '◈',
  tool: '⚙',
  success: '✓',
  error: '✗',
  warning: '⚠',
  web: '⊙',
  model: '◆',
  session: '◉',
  token: '▸',
  cost: '$',
};

const defaultColors: ThemeColors = {
  primary: '#00D9C8',
  secondary: '#7B61FF',
  accent: '#FF6B6B',
  userBubble: '#1a2332',
  aiBubble: '#0d2b2a',
  toolBlock: '#1c1c2e',
  thinkBlock: '#2a1f3d',
  text: '#e0e0e0',
  muted: '#888888',
  dim: '#555555',
  success: '#4ec9b0',
  warning: '#dcdcaa',
  error: '#f44747',
  info: '#569cd6',
  keyword: '#c586c0',
  string_: '#ce9178',
  number: '#b5cea8',
  comment: '#6a9955',
  function_: '#dcdcaa',
};

const catppuccinMochaColors: ThemeColors = {
  primary: '#cba6f7',
  secondary: '#89b4fa',
  accent: '#f38ba8',
  userBubble: '#1e1e2e',
  aiBubble: '#181825',
  toolBlock: '#1e1e2e',
  thinkBlock: '#302041',
  text: '#cdd6f4',
  muted: '#7f849c',
  dim: '#585b70',
  success: '#a6e3a1',
  warning: '#f9e2af',
  error: '#f38ba8',
  info: '#89b4fa',
  keyword: '#cba6f7',
  string_: '#a6e3a1',
  number: '#fab387',
  comment: '#6c7086',
  function_: '#89dceb',
};

const draculaColors: ThemeColors = {
  primary: '#bd93f9',
  secondary: '#8be9fd',
  accent: '#ff79c6',
  userBubble: '#282a36',
  aiBubble: '#21222c',
  toolBlock: '#282a36',
  thinkBlock: '#34294e',
  text: '#f8f8f2',
  muted: '#6272a4',
  dim: '#44475a',
  success: '#50fa7b',
  warning: '#f1fa8c',
  error: '#ff5555',
  info: '#8be9fd',
  keyword: '#ff79c6',
  string_: '#f1fa8c',
  number: '#bd93f9',
  comment: '#6272a4',
  function_: '#50fa7b',
};

const nordColors: ThemeColors = {
  primary: '#88c0d0',
  secondary: '#81a1c1',
  accent: '#bf616a',
  userBubble: '#2e3440',
  aiBubble: '#3b4252',
  toolBlock: '#2e3440',
  thinkBlock: '#3b2e4a',
  text: '#eceff4',
  muted: '#d8dee9',
  dim: '#4c566a',
  success: '#a3be8c',
  warning: '#ebcb8b',
  error: '#bf616a',
  info: '#5e81ac',
  keyword: '#b48ead',
  string_: '#a3be8c',
  number: '#b48ead',
  comment: '#616e88',
  function_: '#88c0d0',
};

const gruvboxColors: ThemeColors = {
  primary: '#fe8019',
  secondary: '#83a598',
  accent: '#fb4934',
  userBubble: '#282828',
  aiBubble: '#1d2021',
  toolBlock: '#282828',
  thinkBlock: '#3c2a2a',
  text: '#ebdbb2',
  muted: '#928374',
  dim: '#665c54',
  success: '#b8bb26',
  warning: '#fabd2f',
  error: '#fb4934',
  info: '#83a598',
  keyword: '#fe8019',
  string_: '#b8bb26',
  number: '#d3869b',
  comment: '#665c54',
  function_: '#fabd2f',
};

const tokyoNightColors: ThemeColors = {
  primary: '#7aa2f7',
  secondary: '#bb9af7',
  accent: '#f7768e',
  userBubble: '#1a1b26',
  aiBubble: '#16161e',
  toolBlock: '#1a1b26',
  thinkBlock: '#1e1a2e',
  text: '#c0caf5',
  muted: '#565f89',
  dim: '#414868',
  success: '#9ece6a',
  warning: '#e0af68',
  error: '#f7768e',
  info: '#7dcfff',
  keyword: '#bb9af7',
  string_: '#9ece6a',
  number: '#ff9e64',
  comment: '#565f89',
  function_: '#7aa2f7',
};

const catppuccinMochaIcons: ThemeIcons = {
  user: '✿',
  ai: '❀',
  thinking: '✦',
  tool: '✧',
  success: '✓',
  error: '✗',
  warning: '⚠',
  web: '◎',
  model: '✦',
  session: '❋',
  token: '◇',
  cost: '$',
};

const draculaIcons: ThemeIcons = {
  user: '▶',
  ai: '◆',
  thinking: '✧',
  tool: '⚡',
  success: '✓',
  error: '✗',
  warning: '⚡',
  web: '◎',
  model: '◈',
  session: '●',
  token: '▪',
  cost: '$',
};

const nordIcons: ThemeIcons = {
  user: '→',
  ai: '★',
  thinking: '◇',
  tool: '▶',
  success: '✓',
  error: '✗',
  warning: '▲',
  web: '⊙',
  model: '◈',
  session: '◉',
  token: '·',
  cost: '$',
};

const gruvboxIcons: ThemeIcons = {
  user: '>',
  ai: '#',
  thinking: '?',
  tool: '!',
  success: '✓',
  error: '✗',
  warning: '!!',
  web: '@',
  model: '*',
  session: '&',
  token: '.',
  cost: '$',
};

const tokyoNightIcons: ThemeIcons = {
  user: '›',
  ai: 'Λ',
  thinking: '◎',
  tool: '⚙',
  success: '✓',
  error: '✗',
  warning: '△',
  web: '◎',
  model: '♦',
  session: '◆',
  token: '◦',
  cost: '$',
};

export const themes: Record<ThemeName, Theme> = {
  default: {
    name: 'default',
    colors: defaultColors,
    icons: defaultIcons,
  },
  'catppuccin-mocha': {
    name: 'catppuccin-mocha',
    colors: catppuccinMochaColors,
    icons: catppuccinMochaIcons,
  },
  dracula: {
    name: 'dracula',
    colors: draculaColors,
    icons: draculaIcons,
  },
  nord: {
    name: 'nord',
    colors: nordColors,
    icons: nordIcons,
  },
  gruvbox: {
    name: 'gruvbox',
    colors: gruvboxColors,
    icons: gruvboxIcons,
  },
  'tokyo-night': {
    name: 'tokyo-night',
    colors: tokyoNightColors,
    icons: tokyoNightIcons,
  },
};

export function getTheme(name: ThemeName): Theme {
  return themes[name] ?? themes.default;
}

const ThemeContext = createContext<Theme>(themes.default);

export const ThemeProvider = ThemeContext.Provider;

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

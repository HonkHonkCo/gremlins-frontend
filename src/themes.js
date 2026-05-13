// Группы тем
export const THEME_GROUPS = {
  gremlins: {
    label: 'GREMLINS',
    labelRu: 'ГРЕМЛИНЫ',
    themes: ['default', 'warehouse', 'arcane', 'amber']
  },
  fairies: {
    label: 'FAIRIES',
    labelRu: 'ФЕИ',
    themes: ['fairy_lilac', 'fairy_pink', 'fairy_green', 'fairy_violet', 'fairy_gold']
  }
}

export const themes = {
  // ── ГРЕМЛИНЫ ──────────────────────────────────────────────────────────────
  default: {
    name: 'GREMLINS BASE', nameRu: 'GREMLINS BASE',
    group: 'gremlins', preview: '#f0b830',
    vars: {
      '--gold': '#f0b830', '--gold-dim': '#c48a10',
      '--bg': '#1a1812', '--bg2': '#252218', '--bg3': '#322f22',
      '--border': '#504a38',
      '--text': '#fff8e8', '--text-dim': '#f0e8cc', '--text-muted': '#c8b888',
      '--accent': '#f0b830', '--accent-glow': '#f0b83070',
      '--green': '#4adf78', '--green-bg': '#0d2a1a',
      '--red': '#ff5a5a', '--red-bg': '#2a0e0e',
    }
  },
  warehouse: {
    name: 'DARK WAREHOUSE', nameRu: 'ТЁМНЫЙ СКЛАД',
    group: 'gremlins', preview: '#00cc66',
    vars: {
      '--gold': '#00cc66', '--gold-dim': '#008844',
      '--bg': '#0d0f0a', '--bg2': '#141a10', '--bg3': '#1c2416',
      '--border': '#2a3820',
      '--text': '#e8f0d8', '--text-dim': '#c0d0a8', '--text-muted': '#7a9068',
      '--accent': '#00cc66', '--accent-glow': '#00cc6660',
      '--green': '#00ff88', '--green-bg': '#001a0d',
      '--red': '#ff4444', '--red-bg': '#2a0808',
    }
  },
  arcane: {
    name: 'ARCANE BLUE', nameRu: 'МАГИЧЕСКИЙ',
    group: 'gremlins', preview: '#4488ff',
    vars: {
      '--gold': '#4488ff', '--gold-dim': '#2255cc',
      '--bg': '#080a12', '--bg2': '#0e1220', '--bg3': '#141a2e',
      '--border': '#1e2a44',
      '--text': '#d0e0ff', '--text-dim': '#a0b8e8', '--text-muted': '#6080a8',
      '--accent': '#4488ff', '--accent-glow': '#4488ff60',
      '--green': '#44ffaa', '--green-bg': '#001a0d',
      '--red': '#ff6644', '--red-bg': '#2a0e08',
    }
  },
  amber: {
    name: 'AMBER LANTERN', nameRu: 'ЯНТАРНЫЙ',
    group: 'gremlins', preview: '#ff9933',
    vars: {
      '--gold': '#ff9933', '--gold-dim': '#cc6600',
      '--bg': '#0f0a06', '--bg2': '#1a1208', '--bg3': '#241a0e',
      '--border': '#3d2a14',
      '--text': '#f5e8cc', '--text-dim': '#d8c8a0', '--text-muted': '#9a8060',
      '--accent': '#ff9933', '--accent-glow': '#ff993360',
      '--green': '#88dd44', '--green-bg': '#0d1a06',
      '--red': '#ff4444', '--red-bg': '#2a0808',
    }
  },

  // ── ФЕИ — bg/bg2/bg3 непрозрачные! прозрачность только через CSS классы ──
  fairy_lilac: {
    name: 'LILAC FAIRY', nameRu: 'ЛИЛОВАЯ',
    group: 'fairies', preview: '#c97fd4',
    vars: {
      '--gold': '#e8a0c8', '--gold-dim': '#a0608a',
      '--bg': '#0d0f1a', '--bg2': '#13152a', '--bg3': '#1e1f38',
      '--border': '#3d2d5a',
      '--text': '#e8dff0', '--text-dim': '#c8b8e0', '--text-muted': '#8a7aaa',
      '--accent': '#c97fd4', '--accent-glow': '#c97fd450',
      '--green': '#7be0a0', '--green-bg': '#0d1f18',
      '--red': '#f07080', '--red-bg': '#2a0e18',
    }
  },
  fairy_pink: {
    name: 'PINK FAIRY', nameRu: 'РОЗОВАЯ',
    group: 'fairies', preview: '#f09ab0',
    vars: {
      '--gold': '#f09ab0', '--gold-dim': '#b06070',
      '--bg': '#160d12', '--bg2': '#221018', '--bg3': '#301520',
      '--border': '#5a2d3d',
      '--text': '#f0e0e8', '--text-dim': '#d8b8c8', '--text-muted': '#aa7a8a',
      '--accent': '#f09ab0', '--accent-glow': '#f09ab050',
      '--green': '#80e0b0', '--green-bg': '#0d1f18',
      '--red': '#f07070', '--red-bg': '#2a0e18',
    }
  },
  fairy_green: {
    name: 'FOREST FAIRY', nameRu: 'ЛЕСНАЯ',
    group: 'fairies', preview: '#7be0a0',
    vars: {
      '--gold': '#a0e8b8', '--gold-dim': '#60a870',
      '--bg': '#0a1410', '--bg2': '#101e14', '--bg3': '#162a1c',
      '--border': '#2d5a3d',
      '--text': '#dff0e4', '--text-dim': '#b8d8c0', '--text-muted': '#7aaa88',
      '--accent': '#7be0a0', '--accent-glow': '#7be0a050',
      '--green': '#7be0a0', '--green-bg': '#0d1f12',
      '--red': '#f08070', '--red-bg': '#2a0e0e',
    }
  },
  fairy_violet: {
    name: 'VIOLET FAIRY', nameRu: 'ФИОЛЕТОВАЯ',
    group: 'fairies', preview: '#8860d4',
    vars: {
      '--gold': '#b090e8', '--gold-dim': '#7050a8',
      '--bg': '#0e0a1a', '--bg2': '#150e28', '--bg3': '#1e1438',
      '--border': '#3a2860',
      '--text': '#e0d8f8', '--text-dim': '#c0b0e8', '--text-muted': '#8870b8',
      '--accent': '#8860d4', '--accent-glow': '#8860d450',
      '--green': '#80d0b0', '--green-bg': '#0d1820',
      '--red': '#e07080', '--red-bg': '#2a0e18',
    }
  },
  fairy_gold: {
    name: 'GOLDEN FAIRY', nameRu: 'ЗОЛОТАЯ',
    group: 'fairies', preview: '#e8c86a',
    vars: {
      '--gold': '#e8c86a', '--gold-dim': '#a88830',
      '--bg': '#140f04', '--bg2': '#201608', '--bg3': '#2c1e0e',
      '--border': '#5a4420',
      '--text': '#f8f0d8', '--text-dim': '#e0d0a8', '--text-muted': '#b89860',
      '--accent': '#e8c86a', '--accent-glow': '#e8c86a50',
      '--green': '#90d880', '--green-bg': '#0d1a08',
      '--red': '#f07060', '--red-bg': '#2a0e08',
    }
  },
}

export function isFairyTheme(themeId) {
  return (themeId || '').startsWith('fairy')
}

export function getTheme() {
  return localStorage.getItem('pg_theme') || 'default'
}

export function setTheme(themeId) {
  localStorage.setItem('pg_theme', themeId)
  applyTheme(themeId)
}

export function applyTheme(themeId) {
  const theme = themes[themeId] || themes.default
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

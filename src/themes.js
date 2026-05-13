export const themes = {
  default: {
    name: 'GREMLINS BASE',
    nameRu: 'GREMLINS BASE',
    preview: '#f0b830',
    vars: {
      '--gold': '#f0b830',
      '--gold-dim': '#c48a10',
      '--bg': '#1a1812',
      '--bg2': '#252218',
      '--bg3': '#322f22',
      '--border': '#504a38',
      '--text': '#fff8e8',
      '--text-dim': '#f0e8cc',
      '--text-muted': '#c8b888',
      '--accent': '#f0b830',
      '--accent-glow': '#f0b83070',
      '--green': '#4adf78',
      '--green-bg': '#0d2a1a',
      '--red': '#ff5a5a',
      '--red-bg': '#2a0e0e',
    }
  },

  warehouse: {
    name: 'DARK WAREHOUSE',
    nameRu: 'ТЁМНЫЙ СКЛАД',
    preview: '#00cc66',
    vars: {
      '--gold': '#00cc66',
      '--gold-dim': '#008844',
      '--bg': '#0d0f0a',
      '--bg2': '#141a10',
      '--bg3': '#1c2416',
      '--border': '#2a3820',
      '--text': '#e8f0d8',
      '--text-dim': '#c0d0a8',
      '--text-muted': '#7a9068',
      '--accent': '#00cc66',
      '--accent-glow': '#00cc6660',
      '--green': '#00ff88',
      '--green-bg': '#001a0d',
      '--red': '#ff4444',
      '--red-bg': '#2a0808',
    }
  },

  arcane: {
    name: 'ARCANE BLUE',
    nameRu: 'МАГИЧЕСКИЙ',
    preview: '#4488ff',
    vars: {
      '--gold': '#4488ff',
      '--gold-dim': '#2255cc',
      '--bg': '#080a12',
      '--bg2': '#0e1220',
      '--bg3': '#141a2e',
      '--border': '#1e2a44',
      '--text': '#d0e0ff',
      '--text-dim': '#a0b8e8',
      '--text-muted': '#6080a8',
      '--accent': '#4488ff',
      '--accent-glow': '#4488ff60',
      '--green': '#44ffaa',
      '--green-bg': '#001a0d',
      '--red': '#ff6644',
      '--red-bg': '#2a0e08',
    }
  },

  amber: {
    name: 'AMBER LANTERN',
    nameRu: 'ЯНТАРНЫЙ',
    preview: '#ff9933',
    vars: {
      '--gold': '#ff9933',
      '--gold-dim': '#cc6600',
      '--bg': '#0f0a06',
      '--bg2': '#1a1208',
      '--bg3': '#241a0e',
      '--border': '#3d2a14',
      '--text': '#f5e8cc',
      '--text-dim': '#d8c8a0',
      '--text-muted': '#9a8060',
      '--accent': '#ff9933',
      '--accent-glow': '#ff993360',
      '--green': '#88dd44',
      '--green-bg': '#0d1a06',
      '--red': '#ff4444',
      '--red-bg': '#2a0808',
    }
  },

  fairy: {
    name: 'PERSONAL FAIRIES',
    nameRu: 'МИР ФЕЙ',
    preview: '#c97fd4',
    vars: {
      '--gold': '#e8a0c8',
      '--gold-dim': '#a0608a',
      '--bg': '#0d0f1a',
      '--bg2': '#13152280',
      '--bg3': '#1e1f3099',
      '--border': '#3d2d5a',
      '--text': '#e8dff0',
      '--text-dim': '#c8b8e0',
      '--text-muted': '#8a7aaa',
      '--accent': '#c97fd4',
      '--accent-glow': '#c97fd450',
      '--green': '#7be0a0',
      '--green-bg': '#0d1f18',
      '--red': '#f07080',
      '--red-bg': '#2a0e18',
    }
  }
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

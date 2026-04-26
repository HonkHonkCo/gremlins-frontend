export const themes = {
  default: {
    name: 'GREMLINS BASE',
    nameRu: 'GREMLINS BASE',
    preview: '#d4a017',
    vars: {
      '--gold': '#d4a017',
      '--gold-dim': '#9a7310',
      '--bg': '#0e0d0b',
      '--bg2': '#1a1916',
      '--bg3': '#252320',
      '--border': '#3a3830',
      '--text': '#f0e8d0',
      '--text-dim': '#d8d0bc',
      '--text-muted': '#a09888',
      '--accent': '#d4a017',
      '--accent-glow': '#d4a01760',
      '--green': '#3ecf70',
      '--green-bg': '#0d2a1a',
      '--red': '#e24b4a',
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

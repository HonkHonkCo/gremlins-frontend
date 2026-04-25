import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { fontBase64 } from './font.js'

// Inject font as base64
const style = document.createElement('style')
style.textContent = `@font-face {
  font-family: 'CMUTypewriter';
  src: url('data:font/truetype;base64,${fontBase64}') format('truetype');
  font-weight: normal;
  font-style: normal;
}`
document.head.appendChild(style)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

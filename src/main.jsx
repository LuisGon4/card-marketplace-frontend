import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// BrowserRouter must come from "react-router" (v8 merged react-router-dom in;
// "react-router/dom" is framework/data-mode only and does not export it —
// see plans/homepage.md §2).
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

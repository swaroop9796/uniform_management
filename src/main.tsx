import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { CompanyConfigProvider } from '@/contexts/CompanyConfigContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CompanyConfigProvider>
        <App />
      </CompanyConfigProvider>
    </BrowserRouter>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@telegram-apps/telegram-ui/dist/styles.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { applyTelegramTheme } from './lib/telegramTheme'
import { AppRoot } from '@telegram-apps/telegram-ui'

applyTelegramTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppRoot>
  </StrictMode>,
)

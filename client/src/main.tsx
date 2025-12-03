import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'

// Désactiver la restauration automatique du scroll du navigateur
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

// Remettre le scroll en haut au chargement initial
window.addEventListener('load', () => {
  window.scrollTo(0, 0)
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.scrollTo(0, 0)
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)



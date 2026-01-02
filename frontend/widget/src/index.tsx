/**
 * Myndulon Widget Entry Point
 *
 * Usage:
 * <script src="https://your-domain.com/widget.js"></script>
 * <script>
 *   MyndulonWidget.init({
 *     botId: 'your-bot-id',
 *     apiKey: 'your-api-key',
 *     apiUrl: 'https://your-api.com' // Optional
 *   })
 * </script>
 */

import ReactDOM from 'react-dom/client'
import ChatWidget from './components/ChatWidget'
import type { WidgetConfig } from './types'

// Global widget API
declare global {
  interface Window {
    MyndulonWidget: {
      init: (config: WidgetConfig) => void
      destroy: () => void
    }
  }
}

let widgetRoot: ReactDOM.Root | null = null
let widgetContainer: HTMLDivElement | null = null
let shadowRoot: ShadowRoot | null = null

/**
 * Initialize the widget with Shadow DOM isolation.
 */
function init(config: WidgetConfig) {
  // Validate configuration
  if (!config.botId || !config.apiKey) {
    console.error('MyndulonWidget: botId and apiKey are required')
    return
  }

  // Clean up existing widget if any
  destroy()

  // Create container element
  widgetContainer = document.createElement('div')
  widgetContainer.id = 'myndulon-widget-root'
  document.body.appendChild(widgetContainer)

  // Create Shadow DOM for style isolation
  shadowRoot = widgetContainer.attachShadow({ mode: 'open' })

  // Create mount point inside shadow root
  const mountPoint = document.createElement('div')
  mountPoint.id = 'myndulon-widget-app'
  shadowRoot.appendChild(mountPoint)

  // Add base styles to shadow DOM
  const style = document.createElement('style')
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    #myndulon-widget-app {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    ::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
  `
  shadowRoot.appendChild(style)

  // Render React app inside shadow root
  widgetRoot = ReactDOM.createRoot(mountPoint)
  widgetRoot.render(<ChatWidget config={config} />)

  console.log('MyndulonWidget initialized:', config.botId)
}

/**
 * Destroy the widget and clean up.
 */
function destroy() {
  if (!widgetRoot && !widgetContainer) {
    // Nothing to destroy
    return
  }

  if (widgetRoot) {
    widgetRoot.unmount()
    widgetRoot = null
  }

  if (widgetContainer && widgetContainer.parentNode) {
    widgetContainer.parentNode.removeChild(widgetContainer)
    widgetContainer = null
  }

  shadowRoot = null
}

// Expose global API
window.MyndulonWidget = {
  init,
  destroy,
}

// Auto-initialize if data attributes are present on script tag
document.addEventListener('DOMContentLoaded', () => {
  const scriptTag = document.querySelector('script[data-myndulon-bot-id]')

  if (scriptTag) {
    const botId = scriptTag.getAttribute('data-myndulon-bot-id')
    const apiKey = scriptTag.getAttribute('data-myndulon-api-key')
    const apiUrl = scriptTag.getAttribute('data-myndulon-api-url') || undefined

    if (botId && apiKey) {
      init({ botId, apiKey, apiUrl })
    }
  }
})

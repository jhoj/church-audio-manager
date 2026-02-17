import { ChurchAudioWidget } from './widget';
import type { WidgetConfig } from './types';

// Auto-initialize from the <script> tag's data attributes
// Usage:
//   <script src="church-audio-widget.iife.js"
//     data-api-url="https://api.yourchurch.com"
//     data-api-key="pk_live_xxxxxx"
//     data-container-id="church-audio-widget">   <!-- optional, defaults to "church-audio-widget" -->
//   </script>
//   <div id="church-audio-widget"></div>

function init() {
  const script = document.currentScript as HTMLScriptElement | null
    ?? document.querySelector<HTMLScriptElement>('script[data-api-url]');

  if (!script) {
    console.error('[church-audio-widget] Could not locate script tag.');
    return;
  }

  const config: WidgetConfig = {
    apiUrl: script.dataset['apiUrl'] ?? '',
    apiKey: script.dataset['apiKey'] ?? '',
    containerId: script.dataset['containerId'],
  };

  if (!config.apiUrl || !config.apiKey) {
    console.error('[church-audio-widget] data-api-url and data-api-key are required.');
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ChurchAudioWidget(config));
  } else {
    new ChurchAudioWidget(config);
  }
}

init();

// Also export for manual use (e.g. in a framework)
export { ChurchAudioWidget };
export type { WidgetConfig };

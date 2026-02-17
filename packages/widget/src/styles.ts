export const CSS = `
  .ca-widget { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; color: #111; }
  .ca-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .ca-filters select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
  .ca-track-list { display: flex; flex-direction: column; gap: 10px; }
  .ca-track { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: box-shadow 0.15s; }
  .ca-track:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .ca-track.ca-active { border-color: #6366f1; background: #eef2ff; }
  .ca-play-btn { width: 40px; height: 40px; flex-shrink: 0; background: #6366f1; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; }
  .ca-track-info { flex: 1; min-width: 0; }
  .ca-track-title { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ca-track-meta { font-size: 13px; color: #6b7280; margin-top: 2px; }
  .ca-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; background: #f3f4f6; margin-right: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
  .ca-duration { font-size: 13px; color: #9ca3af; flex-shrink: 0; }
  .ca-player { position: sticky; bottom: 0; background: #fff; border-top: 1px solid #e5e7eb; padding: 12px; display: none; }
  .ca-player.ca-visible { display: block; }
  .ca-player-title { font-weight: 600; font-size: 14px; margin-bottom: 6px; }
  .ca-player audio { width: 100%; }
  .ca-pagination { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
  .ca-pagination button { padding: 6px 14px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px; }
  .ca-pagination button:disabled { opacity: 0.4; cursor: default; }
  .ca-error { color: #dc2626; text-align: center; padding: 24px; }
  .ca-loading { text-align: center; padding: 24px; color: #9ca3af; }
`;

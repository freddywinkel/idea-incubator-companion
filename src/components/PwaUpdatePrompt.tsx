import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PwaUpdatePrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  const dismiss = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const update = () => {
    void updateServiceWorker(true);
  };

  return (
    <aside
      className="pwa-update-prompt"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-description"
    >
      <div className="pwa-update-prompt__copy">
        <h2 id="pwa-update-title">
          {needRefresh ? 'A new version is ready' : 'Idea Jar is ready offline'}
        </h2>
        <p id="pwa-update-description">
          {needRefresh
            ? 'Update when you are ready. The app will reload, but your saved ideas stay on this device.'
            : 'You can keep using the app without an internet connection.'}
        </p>
      </div>
      <div className="pwa-update-prompt__actions">
        {needRefresh && (
          <button type="button" className="btn btn-primary" onClick={update}>
            Update
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={dismiss}>
          {needRefresh ? 'Later' : 'Got it'}
        </button>
      </div>
    </aside>
  );
};

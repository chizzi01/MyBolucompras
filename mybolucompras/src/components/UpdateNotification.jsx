// src/components/UpdateNotification.jsx
import { useEffect, useState } from 'react';

export default function UpdateNotification() {
  const [state, setState] = useState('idle'); // idle | available | downloading | ready | error
  const [progress, setProgress] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const updater = window.electronAPI?.updater;
    if (!updater) return;

    const onAvailable = (i) => { setState('available'); setInfo(i); };
    const onProgress = (p) => { setState('downloading'); setProgress(p); };
    const onDownloaded = (i) => { setState('ready'); setInfo(i); };
    const onError = () => { setState('error'); };

    updater.onUpdateAvailable(onAvailable);
    updater.onDownloadProgress(onProgress);
    updater.onUpdateDownloaded(onDownloaded);
    updater.onUpdateError(onError);

    return () => {
      updater.removeAllListeners('update_available');
      updater.removeAllListeners('update_progress');
      updater.removeAllListeners('update_downloaded');
      updater.removeAllListeners('update_error');
    };
  }, []);

  if (state === 'idle') return null;

  const styles = {
    base: {
      position: 'fixed', bottom: 16, left: 16, right: 16, padding: '12px 16px',
      borderRadius: 8, zIndex: 9999, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 14
    },
    available: { background: '#fff3cd', border: '1px solid #ffe69c', color: '#856404' },
    downloading: { background: '#cff4fc', border: '1px solid #b6effb', color: '#055160' },
    ready: { background: '#d1e7dd', border: '1px solid #a3cfbb', color: '#0a3622' },
    error: { background: '#f8d7da', border: '1px solid #f5c2c7', color: '#721c24' },
  };

  const styleMap = { available: 'available', downloading: 'downloading', ready: 'ready', error: 'error' };

  const getMessage = () => {
    if (state === 'available') return `Nueva versión ${info?.version || ''} disponible. Descargando...`;
    if (state === 'downloading') return `Descargando actualización... ${progress ? Math.round(progress.percent) + '%' : ''}`;
    if (state === 'ready') return `Actualización lista. Versión ${info?.version || ''} descargada.`;
    if (state === 'error') return 'Error al descargar la actualización. Intenta más tarde.';
    return '';
    };
  
  return (
    <div style={{ ...styles.base, ...styles[styleMap[state]] }}>
      <span>{getMessage()}</span>
      {state === 'ready' && (
        <button
          onClick={() => window.electronAPI?.updater?.restart()}
          style={{ marginLeft: 12, padding: '6px 12px', background: '#198754', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
        >
          Reiniciar ahora
        </button>
      )}
    </div>
  );
}
import { useState, useCallback } from 'react';
import React from 'react';
import AppModal from '../components/AppModal';

export function useModal() {
  const [config, setConfig] = useState(null);

  const showModal = useCallback((opts) => setConfig(opts), []);
  const hideModal = useCallback(() => setConfig(null), []);

  const modal = config ? (
    <AppModal
      {...config}
      visible
      onClose={() => {
        const cb = config.onClose;
        hideModal();
        cb?.();
      }}
      onConfirm={config.onConfirm ? () => {
        const cb = config.onConfirm;
        hideModal();
        cb();
      } : undefined}
    />
  ) : null;

  return { showModal, modal };
}

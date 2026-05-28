import React, { createContext, useContext } from 'react';

const ViajesContext = createContext({});

export function ViajesProvider({ children }) {
  return <ViajesContext.Provider value={{}}>{children}</ViajesContext.Provider>;
}

export function useViajes() {
  return useContext(ViajesContext);
}

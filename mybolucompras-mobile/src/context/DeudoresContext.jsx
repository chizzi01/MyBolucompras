import React, { createContext, useContext } from 'react';

const DeudoresContext = createContext({});

export function DeudoresProvider({ children }) {
  return <DeudoresContext.Provider value={{}}>{children}</DeudoresContext.Provider>;
}

export function useDeudores() {
  return useContext(DeudoresContext);
}

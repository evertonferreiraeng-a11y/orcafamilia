'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'orcafamilia:saldos-visiveis';

const SaldoVisibilidadeContext = createContext<{ visivel: boolean; alternar: () => void }>({
  visivel: true,
  alternar: () => {},
});

export function SaldoVisibilidadeProvider({ children }: { children: React.ReactNode }) {
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo !== null) setVisivel(salvo === 'true');
  }, []);

  function alternar() {
    setVisivel((atual) => {
      const novo = !atual;
      localStorage.setItem(STORAGE_KEY, String(novo));
      return novo;
    });
  }

  return (
    <SaldoVisibilidadeContext.Provider value={{ visivel, alternar }}>{children}</SaldoVisibilidadeContext.Provider>
  );
}

export function useSaldoVisibilidade() {
  return useContext(SaldoVisibilidadeContext);
}

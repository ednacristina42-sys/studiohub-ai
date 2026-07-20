import { createContext, useContext, useState } from "react";

const PanelCtx = createContext({ active: null, open: () => {}, close: () => {}, toggle: () => {} });

export function PanelProvider({ children }) {
  const [active, setActive] = useState(null); // 'ai' | 'cart' | 'checkout' | null
  const open = (name) => setActive(name);
  const close = (name) => setActive((cur) => (!name || cur === name ? null : cur));
  const toggle = (name) => setActive((cur) => (cur === name ? null : name));
  return <PanelCtx.Provider value={{ active, open, close, toggle }}>{children}</PanelCtx.Provider>;
}

export const usePanels = () => useContext(PanelCtx);

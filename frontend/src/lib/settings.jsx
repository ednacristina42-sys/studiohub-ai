import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { setLocaleSettings, getLocaleSettings } from "@/lib/format";

const SettingsContext = createContext({ settings: getLocaleSettings(), reload: () => {} });

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(getLocaleSettings());
  const [ready, setReady] = useState(false);

  const reload = async () => {
    try {
      const r = await api.get("/settings");
      setLocaleSettings(r.data);
      setSettings(r.data);
    } catch { /* keep defaults */ }
    finally { setReady(true); }
  };

  useEffect(() => { reload(); }, []);

  if (!ready) return null;
  return <SettingsContext.Provider value={{ settings, reload }}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);

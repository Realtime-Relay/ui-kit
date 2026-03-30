import { useState, useCallback } from "react";

const STORAGE_KEY = "relayx-ui-example-config";

export interface AppConfig {
  apiKey: string;
  secret: string;
  mode: "production" | "test";
  deviceIdent: string;
  metrics: string[];
}

const DEFAULT_CONFIG: AppConfig = {
  apiKey: "",
  secret: "",
  mode: "production",
  deviceIdent: "",
  metrics: [],
};

function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function useConfig() {
  const [config, setConfigState] = useState<AppConfig>(loadConfig);

  const saveConfig = useCallback((next: AppConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConfigState(next);
  }, []);

  const isConfigured =
    config.apiKey.length > 0 &&
    config.secret.length > 0 &&
    config.deviceIdent.length > 0 &&
    config.metrics.length > 0;

  return { config, saveConfig, isConfigured };
}

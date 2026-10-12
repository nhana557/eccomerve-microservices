"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type AppEnvironment = "sandbox" | "prod";

interface EnvironmentContextType {
  mode: AppEnvironment;
  isSandbox: boolean;
  isProd: boolean;
  setMode: (mode: AppEnvironment) => void;
  toggleMode: () => void;
}

const STORAGE_KEY = "tstore_env_mode";

const EnvironmentContext = createContext<EnvironmentContextType>({
  mode: "sandbox",
  isSandbox: true,
  isProd: false,
  setMode: () => {},
  toggleMode: () => {},
});

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppEnvironment>("sandbox");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as AppEnvironment;
      if (saved === "prod" || saved === "sandbox") {
        setModeState(saved);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setMode = (newMode: AppEnvironment) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // Ignore localStorage errors
    }
  };

  const toggleMode = () => {
    setMode(mode === "sandbox" ? "prod" : "sandbox");
  };

  const isSandbox = mode === "sandbox";
  const isProd = mode === "prod";

  return (
    <EnvironmentContext.Provider
      value={{
        mode,
        isSandbox,
        isProd,
        setMode,
        toggleMode,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error("useEnvironment must be used within an EnvironmentProvider");
  }
  return context;
}

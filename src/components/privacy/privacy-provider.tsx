"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
const PrivacyContext = createContext({ hidden: false, toggle: () => {} });
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <PrivacyContext.Provider
      value={{ hidden, toggle: () => setHidden((value) => !value) }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}
export function PrivacyToggle() {
  const { hidden, toggle } = useContext(PrivacyContext);
  return (
    <button
      type="button"
      className="icon-button privacy-button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Mostrar dados privados" : "Ocultar dados privados"}
      title={hidden ? "Mostrar dados privados" : "Ocultar dados privados"}
    >
      {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
    </button>
  );
}
export function SensitiveText({ children }: { children: ReactNode }) {
  const { hidden } = useContext(PrivacyContext);
  return hidden ? (
    <span aria-label="Conteúdo privado oculto">••••••</span>
  ) : (
    <>{children}</>
  );
}

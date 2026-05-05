"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type DateContextType = {
  referenceMonth: string; // YYYY-MM ou "" para Global
  setReferenceMonth: (month: string) => void;
};

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: ReactNode }) {
  const [referenceMonth, setReferenceMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <DateContext.Provider value={{ referenceMonth, setReferenceMonth }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error("useDate must be used within a DateProvider");
  }
  return context;
}

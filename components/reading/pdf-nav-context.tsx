"use client";

import { createContext, useContext } from "react";

/**
 * Lets any part of the reading workspace (passage cards, Q&A citations,
 * "return to source" buttons) navigate the PDF viewer to a page without
 * prop-drilling through the annotation/Q&A tree. The provider wires this to
 * the viewer's imperative `goToPage`.
 */
const PdfNavContext = createContext<((page: number) => void) | null>(null);

export function PdfNavProvider({
  goToPage,
  children,
}: {
  goToPage: (page: number) => void;
  children: React.ReactNode;
}) {
  return <PdfNavContext.Provider value={goToPage}>{children}</PdfNavContext.Provider>;
}

/** Returns a page-navigation function, or null when no viewer is mounted. */
export function usePdfNav(): ((page: number) => void) | null {
  return useContext(PdfNavContext);
}

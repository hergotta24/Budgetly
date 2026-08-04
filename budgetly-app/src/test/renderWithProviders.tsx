import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { AppDataProvider } from "@/components/AppDataProvider";
import { ToastProvider } from "@/components/ui/Toast";

/** Renders a feature view inside the real data and toast providers. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(
    <AppDataProvider>
      <ToastProvider>{ui}</ToastProvider>
    </AppDataProvider>,
  );
}

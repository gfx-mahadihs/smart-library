import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PWAInstallPrompt } from "@/components/shared/PWAInstallPrompt";

describe("PWAInstallPrompt", () => {
  it("does not render install UI before the browser prompt is available", () => {
    render(<PWAInstallPrompt />);
    expect(screen.queryByText("Install グন্থাগার")).not.toBeInTheDocument();
  });
});

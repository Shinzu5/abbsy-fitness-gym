"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Toggle light and night mode"
      title="Toggle light / night mode"
    >
      {theme === "night" ? "Light Mode" : "Night Mode"}
    </button>
  );
}

"use client"

import { useSettings } from "@/hooks/use-settings"
import { getDictionary } from "@/lib/i18n/dictionaries"

export function SettingsControls() {
  const { state, setField, resetDefaults } = useSettings()
  const dict = getDictionary(state.language.value)

  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{dict.title}</h2>
        <button
          onClick={resetDefaults}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          {dict.reset}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Theme */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{dict.theme}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setField("theme", "light")}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                state.theme.value === "light" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {dict.light}
            </button>
            <button
              onClick={() => setField("theme", "dark")}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                state.theme.value === "dark" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {dict.dark}
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{dict.language}</label>
          <select
            value={state.language.value}
            onChange={(e) => setField("language", e.target.value as any)}
            className="rounded-lg border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="ta">தமிழ் (Tamil)</option>
          </select>
        </div>

        {/* Font Size */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {dict.fontSize}: {state.fontSize.value}px
          </label>
          <input
            type="range"
            min={14}
            max={24}
            step={1}
            value={state.fontSize.value}
            onChange={(e) => setField("fontSize", Number(e.target.value))}
            className="accent-primary cursor-pointer py-2"
          />
        </div>
      </div>
    </div>
  )
}

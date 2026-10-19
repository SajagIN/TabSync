import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    files: ["lib/tabsync/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "The sync protocol must remain framework-free." },
            { name: "next", message: "The sync protocol must remain framework-free." },
          ],
          patterns: [
            {
              group: ["next/*", "react/*", "@/components/*", "@/hooks/*"],
              message:
                "Protocol modules must not depend on UI, React, or Next.js. Keep the core browser-independent and unit-testable.",
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
]

export default eslintConfig

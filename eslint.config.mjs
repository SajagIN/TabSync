import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintcompat"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/*"],
              importNamePattern: "",
              message:
                "components → hooks → store → {transport, storage} → {merge, validation, version, types}. Imports never point backwards.",
            },
          ],
        },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
]

export default eslintConfig

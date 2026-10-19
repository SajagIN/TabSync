import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const outputDirectory = resolve(fileURLToPath(new URL("../out/", import.meta.url)))
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
])

async function findFile(pathname) {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const requested = resolve(outputDirectory, `.${decodedPath}`)
  if (requested !== outputDirectory && !requested.startsWith(`${outputDirectory}${sep}`))
    return null

  const candidates = [requested]
  if (!extname(requested)) {
    candidates.push(`${requested}.html`, resolve(requested, "index.html"))
  } else if (requested.endsWith(sep)) {
    candidates.push(resolve(requested, "index.html"))
  }

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate
    } catch {
      // Try the next static-export path shape.
    }
  }
  return null
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname
  const file = await findFile(pathname)

  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
    response.end("Not found")
    return
  }

  try {
    const contents = await readFile(file)
    const cacheControl = file.includes(`${sep}_next${sep}static${sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache"
    response.writeHead(200, {
      "content-type": mimeTypes.get(extname(file)) ?? "application/octet-stream",
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff",
    })
    response.end(contents)
  } catch {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" })
    response.end("Could not read the exported file")
  }
})

const port = Number(process.env.PORT ?? 4173)
server.listen(port, "0.0.0.0")

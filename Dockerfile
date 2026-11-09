# 1. Build the game (and refuse to build if the specs are invalid).
FROM node:22-bookworm-slim AS web
WORKDIR /src
ENV OPENSPEC_TELEMETRY=0
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public
COPY pwa ./pwa
COPY openspec ./openspec
RUN npx openspec validate --all --strict && npm run build

# 2. Build the server as one static binary with no symbols or build paths.
FROM golang:1.26-alpine AS server
WORKDIR /src
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -buildid=" -o /out/app .

# 3. Run on a distroless image: no shell, no package manager, not root.
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=server /out/app /app/app
COPY --from=web /src/dist /app/web
ENV STATIC_DIR=/app/web
USER nonroot:nonroot
ENTRYPOINT ["/app/app"]

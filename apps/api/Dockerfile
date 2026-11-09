# ODH internal tools API — multi-stage build (Go -> Alpine).
# Built on the DigitalOcean Droplet by infra/digitalocean/deploy.sh.

FROM golang:1.23-alpine AS build
WORKDIR /src

# Dependencies first, so a code-only change reuses the module cache.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
ARG COMMIT=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
      -ldflags "-s -w -X main.GitCommit=${COMMIT}" \
      -o /out/odh-internal-api .

FROM alpine:3.20
# tzdata is required: every date rule in this system is Asia/Bangkok.
RUN apk add --no-cache ca-certificates tzdata curl \
 && adduser -D -u 10001 odh
ENV TZ=Asia/Bangkok
WORKDIR /app
COPY --from=build /out/odh-internal-api /app/odh-internal-api
USER odh
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:5000/healthz || exit 1
ENTRYPOINT ["/app/odh-internal-api"]
CMD ["serve"]

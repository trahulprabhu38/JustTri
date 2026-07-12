# ---- build stage ----
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server .

# ---- run stage ----
FROM alpine:3.20
WORKDIR /app
RUN adduser -D -u 10001 app && mkdir -p /app/uploads && chown app /app/uploads
COPY --from=build /out/server /app/server
ENV GARMIN_DATA_DIR=/data \
    UPLOAD_DIR=/app/uploads \
    PORT=8080 \
    GIN_MODE=release
USER app
EXPOSE 8080
CMD ["/app/server"]

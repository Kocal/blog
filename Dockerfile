FROM oven/bun:1-debian as build
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
	git \
	&& rm -rf /var/lib/apt/lists/*

COPY --link package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY --link . ./
RUN bun run build

FROM caddy:latest as caddy

ENV SERVER_NAME=localhost

COPY --from=build /app/.vitepress/dist /srv
COPY --link Caddyfile /etc/caddy/Caddyfile

CMD [ "caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]

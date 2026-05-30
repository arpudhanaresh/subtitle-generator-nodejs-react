# Docker Deployment

Use `production.env` for Docker deployments. Keep real secrets in `production.env`
and commit only `production.env.example`.

## Prerequisites

- Docker and Docker Compose installed on the server.
- A MySQL database already created.
- A valid Deepgram API key.
- `production.env` filled with production values.

Important production values:

```env
PORT=5000
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DEEPGRAM_API_KEY=your-deepgram-key
VITE_API_URL=https://your-api-domain.com
```

`VITE_API_URL` is baked into the frontend during the Docker build, so set it to
the public API URL before building the image.

## Required Docker Files

If Docker files are not already present, add these files before deploying.

### `api/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "main.py"]
```

### `app/Dockerfile`

```dockerfile
FROM node:24-alpine AS build

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
```

### `docker-compose.yml`

```yaml
services:
  api:
    build:
      context: ./api
    env_file:
      - ./production.env
    ports:
      - "${PORT:-5000}:5000"
    restart: unless-stopped

  app:
    build:
      context: ./app
      args:
        VITE_API_URL: ${VITE_API_URL}
    env_file:
      - ./production.env
    ports:
      - "80:80"
    depends_on:
      - api
    restart: unless-stopped
```

## Deploy

From the repository root:

```bash
docker compose --env-file production.env up --build -d
```

Check container status:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f api
docker compose logs -f app
```

Stop the deployment:

```bash
docker compose down
```

## After Deploy

- Open the frontend domain in the browser.
- Confirm the frontend can reach `VITE_API_URL`.
- Confirm the backend starts and logs `Connected to MySQL`.
- Upload a small video and verify that an `.srt` file can be downloaded.

## Notes

- The backend uses `imageio-ffmpeg`, so a separate system FFmpeg install is not
  normally required inside the container.
- The backend creates the `subtitles` table automatically, but the database
  itself must already exist.
- If you change `production.env`, rebuild the frontend so the new
  `VITE_API_URL` is included in the static bundle.

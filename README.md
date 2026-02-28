# Help My Travel

Aplicativo para viajantes descobrirem restaurantes próximos, visualizarem e traduzirem cardápios automaticamente, montarem pedidos e se comunicarem com funcionários em tempo real via tradução bidirecional.

## Arquitetura

```
helpmytravel/
├── apps/
│   ├── mobile/     # React Native + Expo SDK 52
│   ├── admin/      # Next.js 15 (App Router)
│   └── api/        # NestJS 10
├── packages/
│   ├── shared/     # Tipos TypeScript e constantes compartilhadas
│   └── database/   # Prisma schema e migrations
```

## Pré-requisitos

- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose (para PostgreSQL e Redis)

## Setup Inicial

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas chaves de API
```

### 3. Subir banco de dados e Redis

```bash
docker-compose up -d
```

### 4. Rodar migrations e seed

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Iniciar todos os apps em modo dev

```bash
pnpm dev
```

- **API**: http://localhost:3001
- **Swagger**: http://localhost:3001/api
- **Admin**: http://localhost:3000
- **Mobile**: Expo Go (escanear QR code)

## APIs Externas Necessárias

| API | Uso | Onde obter |
|-----|-----|-----------|
| Google Places API | Busca de restaurantes próximos | [Google Cloud Console](https://console.cloud.google.com) |
| Google Geocoding API | Converter endereço em coordenadas | Mesma key do Places |
| Google Translate API | Tradução de cardápios e comunicação | [Google Cloud Console](https://console.cloud.google.com) |
| Google OAuth 2.0 | Login com Gmail | [Google Cloud Console](https://console.cloud.google.com) |

## Funcionalidades

### App Mobile
- Login/cadastro com email+senha ou Google
- Recuperação de senha por email
- Mapa com restaurantes próximos (Google Places)
- Filtro de raio: 1 / 5 / 10 / 15 km
- Busca por endereço manual
- Visualização e tradução automática de cardápios
- Grid interativo de pedidos com quantidades
- Comunicação bidirecional com tradução em tempo real
- Avaliações e upload de fotos de restaurantes

### Admin Web
- Dashboard com estatísticas
- Gerenciamento de usuários
- Moderação de avaliações e fotos
- Visualização e gestão do cache de cardápios

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Mobile | React Native + Expo SDK 52 + Expo Router |
| Admin | Next.js 15 + TailwindCSS + shadcn/ui |
| API | NestJS 10 + TypeScript |
| Banco | PostgreSQL 16 |
| Cache | Redis 7 |
| ORM | Prisma |
| Filas | BullMQ |
| Auth | JWT + Passport.js + Google OAuth2 |
| Scraping | Puppeteer |
| OCR | Tesseract.js + pdf-parse |
| Tradução | Google Translate API |
| Upload | Multer (local dev) / AWS S3 (prod) |

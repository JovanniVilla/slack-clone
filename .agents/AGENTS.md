# Contexto Unificado del Proyecto: Slack Clone (Self-Hosted Architecture)

Este documento proporciona el contexto técnico, arquitectónico y operativo del proyecto tras la migración a un stack **100% independiente y autoalojable en VPS**, eliminando cualquier dependencia de proveedores terceros propietarios (como Convex).

---

## 1. Visión General del Proyecto

**Slack Clone** es una aplicación web de mensajería y colaboración en tiempo real con soporte para espacios de trabajo (workspaces), canales públicos, mensajes directos (1 a 1), hilos de conversación anidados (threads), reacciones con emojis, subida de archivos adjuntos (imágenes en disco local) y editor enriquecido de texto (WYSIWYG con Quill 2.0).

### Capacidades Principales
- **Autenticación Autónoma**: Registro e inicio de sesión con email/contraseña cifrados con bcrypt, Google OAuth y GitHub OAuth mediante **NextAuth v5 (Auth.js)** y `@auth/drizzle-adapter`.
- **Base de Datos Relacional y Migraciones**: Modelado estricto con **PostgreSQL 16** y **Drizzle ORM** (`src/db/schema.ts`).
- **Tiempo Real Aislado de Alto Desempeño**: Microservicio dedicado de **Socket.io** (`socket-server/`) corriendo en contenedor independiente, evitando saturar el event loop de Next.js.
- **Entrega Acelerada de Archivos**: Volumen en disco local servido directamente por **Nginx** usando `sendfile` a nivel de kernel, sin intermediación de Node.js ni sobrecarga de S3.
- **Espacios de Trabajo (Workspaces)**: Creación de workspaces, cambio rápido (switcher), generación y regeneración de códigos de invitación de 6 caracteres (`joinCode`).
- **Control de Acceso Basado en Roles (RBAC)**: Roles de `admin` y `member` por espacio de trabajo.
- **Canales y DMs**: Canales temáticos (#general por defecto) y conversaciones privadas 1 a 1.
- **Hilos de Conversación (Threads)**: Respuestas anidadas en mensajes principales con conteo, avatar del último participante y marcas de tiempo.
- **Interfaz Dividida y Redimensionable**: Paneles colapsables y redimensionables (`react-resizable-panels`) coordinados mediante `usePanel()` y `nuqs`.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Framework Frontend** | [Next.js](https://nextjs.org/) | `16.4.2` (App Router, standalone output) |
| **Librería UI** | [React](https://react.dev/) | `19.3.0` |
| **Lenguaje** | [TypeScript](https://www.typescriptlang.org/) | `5.9.3` (Strict mode) |
| **Base de Datos** | [PostgreSQL](https://www.postgresql.org/) | `16-alpine` (Docker) |
| **ORM & Migraciones** | [Drizzle ORM](https://orm.drizzle.team/) | `0.45.4` (`drizzle-orm`, `drizzle-kit`, `postgres`) |
| **Autenticación** | [Auth.js / NextAuth v5](https://authjs.dev/) | `5.0.0-beta.32` (`@auth/drizzle-adapter`, `bcryptjs`) |
| **Tiempo Real (WebSockets)** | [Socket.io](https://socket.io/) | `4.8.4` (Microservicio independiente en puerto 4000) |
| **Gestión de Estado / Caché** | [TanStack Query](https://tanstack.com/query) + [Jotai](https://jotai.org/) + [nuqs](https://nuqs.47ng.com/) | Query v5 para servidor, Jotai para modales, nuqs para URL |
| **Proxy & Servidor Web** | [Nginx](https://nginx.org/) | `alpine` con `sendfile` y WebSocket upgrade |
| **Editor de Texto** | [Quill](https://quilljs.com/) | `2.0.3` con estilos snow |
| **Estilos & UI Kit** | [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) | Tailwind v3.4.19, Radix primitives, Lucide React, React Icons |
| **Orquestación VPS** | [Docker Compose](https://docs.docker.com/compose/) | Compose v2 (`docker-compose.yml`) |
| **Package Manager** | [pnpm](https://pnpm.io/) | `11.10.0` |

---

## 3. Estructura de Directorios

```bash
slack-clone/
├── .agents/
│   └── AGENTS.md                  # Contexto unificado y reglas para agentes de IA
├── drizzle/                       # Migraciones SQL generadas por Drizzle Kit
│   └── 0000_cool_madelyne_pryor.sql
├── nginx/
│   └── nginx.conf                 # Configuración de Nginx para producción y proxy inverso
├── socket-server/                 # Microservicio independiente de WebSockets
│   ├── src/
│   │   └── server.ts              # Servidor HTTP + Socket.io con puente REST (/emit)
│   ├── Dockerfile                 # Contenedor ultra-ligero para WebSockets
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── app/                       # Rutas de Next.js (App Router)
│   │   ├── api/                   # Route Handlers REST
│   │   │   ├── auth/              # [...nextauth], register
│   │   │   ├── channels/          # GET, POST, [channelId] (GET, PATCH, DELETE)
│   │   │   ├── conversations/     # POST (create or get)
│   │   │   ├── members/           # GET, current, [memberId] (GET, PATCH, DELETE)
│   │   │   ├── messages/          # GET (cursor paginated), POST, [messageId]
│   │   │   ├── reactions/         # POST (toggle)
│   │   │   ├── upload/            # POST (high performance disk storage)
│   │   │   ├── users/             # current
│   │   │   └── workspaces/        # GET, POST, [workspaceId], info, join, new-join-code
│   │   ├── auth/                  # Pantalla de autenticación (/auth)
│   │   ├── join/[workspaceId]/    # Ingreso a workspace por código (/join/:id)
│   │   ├── workspace/[workspaceId]/ # Shell principal del workspace
│   │   │   ├── channel/[channelId]/ # Vista de canal
│   │   │   ├── member/[memberId]/   # Vista de DM 1 a 1
│   │   │   └── layout.tsx         # Layout con Toolbar, Sidebar y Paneles
│   │   ├── globals.css
│   │   ├── layout.tsx             # Root layout (AuthProvider, QueryProvider, SocketProvider, Jotai)
│   │   └── page.tsx               # Redirección inicial
│   ├── auth.config.ts             # Configuración de Auth.js compatible con Edge/Middleware
│   ├── auth.ts                    # Configuración principal de NextAuth con DrizzleAdapter
│   ├── components/                # Componentes compartidos y transversales
│   │   ├── ui/                    # Primitivas Shadcn UI
│   │   ├── auth-provider.tsx      # Wrapper cliente de SessionProvider
│   │   ├── query-provider.tsx     # TanStack QueryClientProvider
│   │   ├── socket-provider.tsx    # Contexto WebSocket e invalidación de caché reactiva
│   │   ├── editor.tsx             # Editor Quill
│   │   ├── message.tsx            # Renderizado de mensaje
│   │   └── message-list.tsx       # Lista virtualizada/paginada de mensajes
│   ├── db/                        # Capa de base de datos PostgreSQL
│   │   ├── index.ts               # Cliente Drizzle conectado a Postgres
│   │   ├── migrate.ts             # Script ejecutor de migraciones SQL
│   │   └── schema.ts              # Esquema Drizzle y relaciones relacionales
│   ├── features/                  # Dominio modular (Feature-Sliced)
│   │   ├── auth/                  # api, components, types
│   │   ├── channels/              # api (use-get-channels, etc.), components, store
│   │   ├── conversations/         # api (use-create-or-get-conversation)
│   │   ├── members/               # api (use-get-members, etc.), components (profile.tsx), store
│   │   ├── messages/              # api (use-get-messages, etc.), components (thread.tsx), store
│   │   ├── reactions/             # api (use-toggle-reaction)
│   │   ├── upload/                # api (use-generate-upload-url)
│   │   └── workspaces/            # api (use-create-workspace, etc.), components, store
│   ├── hooks/                     # Custom hooks utilitarios
│   ├── lib/
│   │   ├── socket-emitter.ts      # Despachador interno de eventos Next.js -> socket-server
│   │   └── utils.ts               # Helper cn()
│   ├── middleware.ts              # NextAuth v5 middleware
│   └── types/
│       └── data-model.ts          # Tipos Id y Doc universales
├── docker-compose.yml             # Orquestación de producción (Postgres, App, Sockets, Nginx)
├── Dockerfile                     # Construcción standalone de Next.js
├── drizzle.config.ts              # Configuración de Drizzle Kit
├── package.json
└── tsconfig.json
```

---

## 4. Esquema de Base de Datos (Drizzle ORM)

Definido en `src/db/schema.ts`:

1. **`users`**: `id` (text PK), `name`, `email` (unique), `emailVerified`, `image`, `password` (bcrypt hash), `createdAt`.
2. **`accounts`**, **`sessions`**, **`verificationTokens`**: Tablas estándar de Auth.js para sesiones y proveedores OAuth.
3. **`workspaces`**: `id` (uuid PK), `name`, `userId` (FK users), `joinCode` (6 caracteres), `createdAt`.
4. **`members`**: `id` (uuid PK), `userId` (FK users), `workspaceId` (FK workspaces), `role` (`'admin' | 'member'`), `createdAt`. Índice único `(workspaceId, userId)`.
5. **`channels`**: `id` (uuid PK), `name`, `workspaceId` (FK workspaces), `createdAt`.
6. **`conversations`**: `id` (uuid PK), `workspaceId` (FK workspaces), `memberOneId` (FK members), `memberTwoId` (FK members). Índice único `(workspaceId, memberOneId, memberTwoId)`.
7. **`messages`**: `id` (uuid PK), `body`, `image` (URL /uploads/...), `memberId` (FK members), `workspaceId` (FK workspaces), `channelId` (FK channels), `conversationId` (FK conversations), `parentMessageId` (FK messages), `updatedAt`, `createdAt`.
8. **`reactions`**: `id` (uuid PK), `workspaceId`, `messageId` (FK messages), `memberId` (FK members), `value` (emoji). Índice único `(messageId, memberId, value)`.

---

## 5. Patrones Arquitectónicos y Convenciones de Código

### 5.1. Patrón de Hooks en `src/features/*/api`
Para preservar la estabilidad de todos los componentes visuales de la aplicación, los custom hooks en `src/features/*/api` mantienen la firma uniforme:
```typescript
const { mutate, data, error, isPending, isSuccess, isError, isSettled } = useExampleMutation();
```
Por debajo, utilizan llamadas `fetch` a `/api/*` y ejecutan invalidación de caché reactiva con TanStack Query (`queryClient.invalidateQueries(...)`).

### 5.2. Paginación Infinita de Mensajes (`useGetMessages`)
- Endpoint: `GET /api/messages?channelId=...&cursor=...&limit=20`
- Utiliza paginación por cursor en PostgreSQL con ordenación descendente por `createdAt`.
- En el cliente, `useGetMessages` usa `useInfiniteQuery` y expone `{ results, status, loadMore }`, manteniendo compatibilidad total con `<MessageList />`.

### 5.3. Flujo en Tiempo Real (Sockets)
1. Al montarse un canal o conversación, el cliente se une a la sala mediante `joinRoom('channel:XYZ')`.
2. Cuando se crea, actualiza o elimina un mensaje en `/api/messages`, Next.js llama a `emitSocketEvent()` en `src/lib/socket-emitter.ts`.
3. `emitSocketEvent()` envía un `POST /emit` al microservicio en `socket-server:4000`.
4. El microservicio emite el evento en la sala WebSocket correspondiente.
5. El cliente en `src/components/socket-provider.tsx` recibe el evento e invalida automáticamente la caché de TanStack Query, logrando actualización instantánea sin recarga.

### 5.4. Subida y Servido de Imágenes (Alto Rendimiento)
1. El cliente envía el archivo binario a `POST /api/upload`.
2. Next.js valida tamaño (<10MB) y tipo MIME, generando un nombre único y guardándolo en el directorio persistente (`/app/public/uploads`).
3. En producción, **Nginx intercepta las peticiones `/uploads/*`** y las sirve directamente desde el volumen de disco montado mediante la llamada de sistema `sendfile`, logrando latencias inferiores a 1 ms y cero uso de RAM en Node.js.

---

## 6. Variables de Entorno

### `.env.local` (Desarrollo Local)
```env
NEXT_TELEMETRY_DISABLED=1
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/slack_clone"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-nextauth-secret-key-32-characters-long"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
SOCKET_INTERNAL_URL="http://localhost:4000"
INTERNAL_SOCKET_SECRET="slack-clone-internal-socket-secret"
```

### Variables de Producción (VPS en `.env` para Docker Compose)
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=un_password_seguro_de_postgres
NEXTAUTH_SECRET=clave_aleatoria_de_al_menos_32_caracteres
NEXTAUTH_URL=https://tudominio.com
INTERNAL_SOCKET_SECRET=clave_secreta_para_comunicacion_interna_de_sockets
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_CLIENT_ID=
AUTH_GOOGLE_CLIENT_SECRET=
```

---

## 7. Comandos Frecuentes

| Comando | Descripción |
| :--- | :--- |
| `pnpm dev` | Inicia Next.js en `http://localhost:3000`. |
| `cd socket-server && npm run dev` | Inicia el microservicio de WebSockets localmente en el puerto 4000. |
| `pnpm run db:generate` | Genera nuevos archivos de migración SQL en `drizzle/` basados en `src/db/schema.ts`. |
| `pnpm run db:migrate` | Ejecuta las migraciones pendientes en PostgreSQL. |
| `pnpm run db:studio` | Abre la interfaz visual de base de datos Drizzle Studio. |
| `pnpm build` | Compila la aplicación Next.js en modo producción (`standalone`). |
| `docker compose up -d --build` | Despliega toda la infraestructura en el VPS (Postgres, App, Sockets, Nginx). |

---

## 8. Despliegue en VPS con Docker Compose

Para desplegar en tu propio servidor VPS:
1. Clona el repositorio en tu VPS:
   ```bash
   git clone <tu-repo> && cd slack-clone
   ```
2. Crea el archivo `.env` en la raíz con tus contraseñas y claves de producción.
3. Inicia todos los servicios en segundo plano:
   ```bash
   docker compose up -d --build
   ```
4. Ejecuta las migraciones iniciales de base de datos dentro del contenedor:
   ```bash
   docker compose exec app pnpm run db:migrate
   ```
5. La aplicación estará lista y sirviéndose a través de Nginx en el puerto 80 (y 443 con certificado SSL).
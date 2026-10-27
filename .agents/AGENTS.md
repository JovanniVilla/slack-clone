# Contexto Unificado del Proyecto: Slack Clone

Este documento proporciona el contexto técnico, arquitectónico y operativo necesario para que cualquier agente de IA o desarrollador entienda y trabaje en este proyecto de manera coherente y eficiente.

---

## 1. Visión General del Proyecto

**Slack Clone** es una aplicación web de mensajería y colaboración en tiempo real inspirada en Slack. Soporta espacios de trabajo (workspaces), canales públicos, mensajes directos (1 a 1), hilos de conversación (threads), reacciones con emojis, carga de archivos adjuntos (imágenes) y edición enriquecida de texto (WYSIWYG con Quill).

### Capacidades Principales
- **Autenticación Multimodal**: Registro e inicio de sesión con email/contraseña, Google OAuth y GitHub OAuth mediante Convex Auth.
- **Espacios de Trabajo (Workspaces)**: Creación de espacios de trabajo, cambio rápido (switcher), generación y regeneración de códigos de invitación de 6 caracteres (`joinCode`).
- **Control de Acceso Basado en Roles (RBAC)**: Roles de `admin` y `member` por espacio de trabajo.
- **Canales (Channels)**: Canales temáticos dentro de un workspace (canal `#general` creado por defecto).
- **Mensajería Directa (Conversations / DMs)**: Conversaciones privadas 1 a 1 entre miembros del workspace.
- **Hilos de Conversación (Threads)**: Respuestas anidadas en mensajes principales con conteo, avatar del último participante y marcas de tiempo.
- **Editor Enriquecido (Quill 2.0)**: Formato de texto, emojis (`emoji-picker-react`), soporte de pegado y carga de imágenes.
- **Reacciones**: Sistema de toggle para reacciones emoji por mensaje y miembro.
- **Interfaz Dividida y Redimensionable**: Paneles colapsables y redimensionables (`react-resizable-panels`) para navegación, chat principal e hilos/perfiles laterales.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Framework Frontend** | [Next.js](https://nextjs.org/) | `16.4.2` (App Router) |
| **Librería UI** | [React](https://react.dev/) | `19.3.0` |
| **Lenguaje** | [TypeScript](https://www.typescriptlang.org/) | `5.9.3` (Strict mode) |
| **Backend & Base de Datos** | [Convex](https://convex.dev/) | `1.45.0` (Backend reactivo en tiempo real y storage de archivos) |
| **Autenticación** | [@convex-dev/auth](https://labs.convex.dev/auth) + [@auth/core](https://authjs.dev/) | `0.0.96` / `0.41.3` (Password, GitHub, Google) |
| **Estilos & UI Kit** | [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) | Tailwind v3.4.19, Radix primitives, Lucide React, React Icons |
| **Estado Global / URL** | [Jotai](https://jotai.org/) + [nuqs](https://nuqs.47ng.com/) | Jotai para modales; nuqs para sincronización del panel con la URL (`parentMessageId`, `profileMemberId`) |
| **Editor de Texto** | [Quill](https://quilljs.com/) | `2.0.3` con estilos snow |
| **Notificaciones Toast** | [Sonner](https://sonner.emilkowal.ski/) | `2.0.8` |
| **Package Manager** | [pnpm](https://pnpm.io/) | `11.10.0` |

---

## 3. Estructura de Directorios

```bash
slack-clone/
├── .agents/
│   └── AGENTS.md                  # Contexto unificado y reglas para agentes de IA
├── convex/                        # Backend reactivo de Convex
│   ├── _generated/                # Tipos y cliente autogenerados (dataModel, api)
│   ├── auth.config.ts             # Configuración del proveedor de auth
│   ├── auth.ts                    # Providers de auth (Password, GitHub, Google)
│   ├── channels.ts                # Queries y mutaciones para canales
│   ├── conversations.ts           # Queries y mutaciones para DMs (1 a 1)
│   ├── http.ts                    # Enrutador HTTP para webhooks / auth callbacks
│   ├── members.ts                 # Queries y mutaciones para membresías y roles
│   ├── messages.ts                # Queries paginadas y mutaciones de mensajes e hilos
│   ├── reactions.ts               # Mutación de toggle para reacciones
│   ├── schema.ts                  # Esquema de la base de datos de Convex
│   ├── upload.ts                  # Generación de URLs de carga para Convex Storage
│   ├── users.ts                   # Queries de usuario actual
│   └── workspaces.ts              # Queries y mutaciones de workspaces y códigos de unión
├── src/
│   ├── app/                       # Rutas de Next.js (App Router)
│   │   ├── auth/                  # Pantalla de autenticación (/auth)
│   │   ├── join/[workspaceId]/    # Pantalla de ingreso a workspace por código (/join/:id)
│   │   ├── workspace/[workspaceId]/ # Shell principal del workspace
│   │   │   ├── channel/[channelId]/ # Vista de canal (/workspace/:id/channel/:id)
│   │   │   ├── member/[memberId]/   # Vista de conversación 1 a 1 (/workspace/:id/member/:id)
│   │   │   ├── layout.tsx         # Layout con Toolbar, Sidebar y Paneles Redimensionables
│   │   │   └── page.tsx           # Redirección inicial al primer canal o creación
│   │   ├── globals.css            # Estilos globales y variables de Tailwind
│   │   ├── layout.tsx             # Root layout (Proveedores: Convex, Jotai, Sonner, Modals)
│   │   └── page.tsx               # Raíz (/): redirige al primer workspace o abre modal de creación
│   ├── components/                # Componentes compartidos y transversales
│   │   ├── ui/                    # Primitivas de Shadcn UI (button, dialog, avatar, etc.)
│   │   ├── editor.tsx             # Wrapper de Quill con soporte de emojis e imágenes
│   │   ├── message.tsx            # Renderizado de un mensaje individual con toolbar y reacciones
│   │   ├── message-list.tsx       # Lista virtualizada/paginada con separadores por fecha
│   │   ├── reactions.tsx          # Pills de reacciones emoji y conteo
│   │   ├── thread-bar.tsx         # Barra de visualización de hilo debajo del mensaje
│   │   └── modal-provider.tsx     # Montaje de modales globales controlados por Jotai
│   ├── config/                    # Configuración estática y metadatos del sitio
│   ├── features/                  # Arquitectura modular por dominio (Feature-Sliced)
│   │   ├── auth/                  # Componentes y hooks de autenticación
│   │   ├── channels/              # api (use-get-channels, etc.), components, store
│   │   ├── conversations/         # api (use-create-or-get-conversation)
│   │   ├── members/               # api (use-get-member, etc.), components (profile.tsx), store
│   │   ├── messages/              # api (use-get-messages, etc.), components (thread.tsx), store
│   │   ├── reactions/             # api (use-toggle-reaction)
│   │   ├── upload/                # api (use-generate-upload-url)
│   │   └── workspaces/            # api (use-create-workspace, etc.), components, store
│   ├── hooks/                     # Custom hooks utilitarios
│   │   ├── use-channel-id.ts      # Extrae channelId de los params de la ruta
│   │   ├── use-workspace-id.ts    # Extrae workspaceId de los params de la ruta
│   │   ├── use-member-id.ts       # Extrae memberId de los params de la ruta
│   │   ├── use-panel.ts           # Coordina el estado de nuqs (parentMessageId vs profileMemberId)
│   │   └── use-confirm.tsx        # Hook de diálogo de confirmación asíncrono
│   ├── lib/
│   │   └── utils.ts               # Función `cn` (clsx + tailwind-merge)
│   └── middleware.ts              # Convex Auth Next.js middleware para protección de rutas
├── components.json                # Configuración de Shadcn UI
├── next.config.mjs                # Configuración de Next.js (images: unoptimized)
├── package.json                   # Dependencias y scripts de ejecución
├── tsconfig.json                  # Paths (@/* -> ./src/*) y opciones estrictas de TS
└── vercel.sh / vercel.ts          # Scripts de despliegue para Vercel
```

---

## 4. Esquema de Datos y Relaciones (Convex)

El archivo `convex/schema.ts` define las siguientes colecciones e índices:

### Colecciones
1. **`workspaces`**:
   - `name`: string
   - `userId`: `Id<'users'>` (creador/propietario)
   - `joinCode`: string (código de 6 caracteres para invitar)
2. **`members`**:
   - `userId`: `Id<'users'>`
   - `workspaceId`: `Id<'workspaces'>`
   - `role`: `'admin' | 'member'`
   - *Índices*: `by_user_id`, `by_workspace_id`, `by_workspace_id_user_id` (combinado para búsqueda rápida).
3. **`channels`**:
   - `name`: string
   - `workspaceId`: `Id<'workspaces'>`
   - *Índices*: `by_workspace_id`
4. **`conversations`** (Mensajes Directos):
   - `workspaceId`: `Id<'workspaces'>`
   - `memberOneId`: `Id<'members'>`
   - `memberTwoId`: `Id<'members'>`
   - *Índices*: `by_workspace_id`
5. **`messages`**:
   - `body`: string (contenido enriquecido en JSON/Delta o texto)
   - `image`: opcional `Id<'_storage'>` (referencia a archivo en Convex Storage)
   - `memberId`: `Id<'members'>`
   - `workspaceId`: `Id<'workspaces'>`
   - `channelId`: opcional `Id<'channels'>` (presente si es mensaje de canal)
   - `conversationId`: opcional `Id<'conversations'>` (presente si es DM)
   - `parentMessageId`: opcional `Id<'messages'>` (presente si es respuesta a un hilo)
   - `updatedAt`: opcional number (timestamp de última edición)
   - *Índice principal*: `by_channel_id_parent_message_id_conversation_id` (soporta filtrado exacto y paginación en tiempo real).
6. **`reactions`**:
   - `workspaceId`: `Id<'workspaces'>`
   - `messageId`: `Id<'messages'>`
   - `memberId`: `Id<'members'>`
   - `value`: string (carácter o código emoji)
   - *Índices*: `by_workspace_id`, `by_message_id`, `by_member_id`
7. **`...authTables`**:
   - Provistas automáticamente por `@convex-dev/auth/server` (`users`, `authSessions`, `authAccounts`, etc.).

---

## 5. Patrones Arquitectónicos y Convenciones de Código

### 5.1. Patrón de Hooks de Mutación en `src/features/*/api`
Para mantener un manejo homogéneo de peticiones de mutación en toda la aplicación, cada mutación de Convex se envuelve en un custom hook que gestiona estados de ciclo de vida (`isPending`, `isSuccess`, `isError`, `isSettled`):
```typescript
// Ejemplo de patrón en src/features/<feature>/api/use-*.ts
export const useExampleMutation = () => {
  const [data, setData] = useState<ResponseType>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<'success' | 'error' | 'settled' | 'pending' | null>(null);

  const mutation = useMutation(api.<feature>.<action>);

  const mutate = useCallback(async (values: RequestType, options?: Options) => {
    try {
      setStatus('pending');
      const response = await mutation(values);
      options?.onSuccess?.(response);
      return response;
    } catch (err) {
      setStatus('error');
      options?.onError?.(err as Error);
      if (!options?.throwError) throw err;
    } finally {
      setStatus('settled');
      options?.onSettled?.();
    }
  }, [mutation]);

  return { mutate, data, error, isPending, isSuccess, isError, isSettled };
};
```

### 5.2. Estado Global vs Estado en URL
- **Modales (Jotai)**: Los modales que crean recursos (ej: `create-workspace-modal`, `create-channel-modal`) usan átomos simples de Jotai (`src/features/*/store`).
- **Paneles Laterales (nuqs)**: El panel lateral derecho (para mostrar un hilo `parentMessageId` o el perfil de un miembro `profileMemberId`) se sincroniza estrictamente mediante parámetros de búsqueda en la URL con `nuqs` a través del hook `usePanel()`. Esto permite persistencia en recarga y enlaces compartibles.

### 5.3. Flujo de Subida de Archivos
La subida de imágenes para mensajes se realiza en dos fases:
1. Llamar a `api.upload.generateUploadUrl` para obtener una URL de subida temporal de Convex.
2. Hacer un `POST` HTTP del archivo binario a dicha URL, el cual retorna `{ storageId }`.
3. Pasar el `storageId` en la mutación `api.messages.create({ image: storageId, ... })`.

### 5.4. Reglas de Estilo e Importaciones
- **Prettier & Linters**:
  - `printWidth`: 140
  - `singleQuote`: true
  - `semi`: true
  - Orden de importaciones regulado por `@trivago/prettier-plugin-sort-imports`:
    1. Librerías de terceros (`<THIRD_PARTY_MODULES>`)
    2. Rutas con alias absoluto (`^@/(.*)$`)
    3. Rutas relativas (`^[./]`)
- **Tailwind**: Utilizar siempre el helper `cn()` de `@/lib/utils` para combinar clases condicionales.

---

## 6. Variables de Entorno y Configuración

El archivo `.env.local` en la raíz requiere:
```env
# Telemetría desactivada de Next.js
NEXT_TELEMETRY_DISABLED=1

# Despliegue de Convex (generado por `npx convex dev`)
CONVEX_DEPLOYMENT=dev:<deployment-name>

# URL pública de Convex
NEXT_PUBLIC_CONVEX_URL="https://<deployment-name>.convex.cloud"
```

Variables requeridas en el backend de Convex (configuradas mediante `npx convex env set <CLAVE> <VALOR>`):
- `SITE_URL`: URL del frontend (ej. `http://localhost:3000` en local).
- `AUTH_GOOGLE_CLIENT_ID` y `AUTH_GOOGLE_CLIENT_SECRET`: Credenciales de Google Cloud OAuth (Redirect URI: `<CONVEX_HTTP_ACTIONS_URL>/api/auth/callback/google`).
- `AUTH_GITHUB_ID` y `AUTH_GITHUB_SECRET`: Credenciales de GitHub OAuth App (Authorization callback URL: `<CONVEX_HTTP_ACTIONS_URL>/api/auth/callback/github`).

---

## 7. Comandos Frecuentes

| Comando | Descripción |
| :--- | :--- |
| `pnpm dev` | Inicia el servidor de desarrollo de Next.js en `http://localhost:3000`. |
| `npx convex dev` / `pnpm dlx convex dev` | Ejecuta el servidor y watcher de funciones Convex, sincronizando tipos en `convex/_generated`. |
| `pnpm build` | Compila el bundle de producción de Next.js. |
| `pnpm build:production` | Despliega Convex a producción y ejecuta la compilación de Next.js. |
| `pnpm lint` | Analiza el código con ESLint (`next/core-web-vitals` + `prettier`). |
| `pnpm lint:fix` | Corrige problemas automáticos de ESLint. |
| `pnpm format` | Comprueba el formato de código con Prettier. |
| `pnpm format:fix` | Aplica el formato automático de código con Prettier e import sorting. |

> **Nota para agentes**: Al desarrollar localmente, se deben mantener activos tanto el servidor de Next.js (`pnpm dev`) como el de Convex (`pnpm dlx convex dev`) para que las mutaciones y tipos autogenerados estén al día.

---

## 8. Consideraciones Críticas para Agentes

1. **No modificar directamente `convex/_generated/`**: Estos archivos son creados automáticamente por el CLI de Convex. Para cambiar tipos o funciones del backend, modifica los archivos fuente en `convex/*.ts`.
2. **Tipado Estricto de IDs**: Usa siempre `Id<'tabla'>` de `@/../convex/_generated/dataModel` en lugar de `string` para identificadores de Convex en componentes y hooks.
3. **Validación de Roles y Permisos**: Siempre valida en las mutaciones de Convex que el usuario actual (`getAuthUserId(ctx)`) pertenezca al `workspaceId` correspondiente y que posea el rol adecuado (`admin` para regenerar códigos o modificar canales/workspaces).
4. **Respuestas de Hilos**: Un mensaje de hilo debe incluir `parentMessageId`. Si se responde en un DM, hereda el `conversationId` del mensaje padre.
5. **Preservar el Orden de Importaciones**: Al agregar o modificar imports, mantén el orden estricto de Prettier para evitar fallos de linteo (`pnpm format:fix`).
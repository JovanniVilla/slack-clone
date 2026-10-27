// This file is needed to support autocomplete for process.env
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL: string;

      AUTH_GITHUB_ID?: string;
      AUTH_GITHUB_SECRET?: string;

      AUTH_GOOGLE_CLIENT_ID?: string;
      AUTH_GOOGLE_CLIENT_SECRET?: string;

      NEXT_PUBLIC_SOCKET_URL?: string;
      SOCKET_INTERNAL_URL?: string;
      INTERNAL_SOCKET_SECRET?: string;
      UPLOAD_DIR?: string;
    }
  }
}

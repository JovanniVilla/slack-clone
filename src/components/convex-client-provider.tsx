import type { PropsWithChildren } from 'react';

// Deprecated: Replaced by AuthProvider, QueryProvider and SocketProvider
export const ConvexClientProvider = ({ children }: PropsWithChildren) => {
  return <>{children}</>;
};

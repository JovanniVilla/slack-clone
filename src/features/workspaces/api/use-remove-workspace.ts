import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

type RequestType = { id: string };
type ResponseType = string | null;

type Options = {
  onSuccess?: (data: ResponseType) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
  throwError?: boolean;
};

export const useRemoveWorkspace = () => {
  const queryClient = useQueryClient();
  const [data, setData] = useState<ResponseType>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<'success' | 'error' | 'settled' | 'pending' | null>(null);

  const isPending = useMemo(() => status === 'pending', [status]);
  const isSuccess = useMemo(() => status === 'success', [status]);
  const isError = useMemo(() => status === 'error', [status]);
  const isSettled = useMemo(() => status === 'settled', [status]);

  const mutate = useCallback(
    async (values: RequestType, options?: Options) => {
      try {
        setData(null);
        setError(null);
        setStatus('pending');

        const res = await fetch(`/api/workspaces/${values.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const response: ResponseType = await res.json();
        setData(response);
        setStatus('success');
        queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        options?.onSuccess?.(response);

        return response;
      } catch (err) {
        setStatus('error');
        setError(err as Error);
        options?.onError?.(err as Error);

        if (!options?.throwError) throw err;
      } finally {
        setStatus('settled');
        options?.onSettled?.();
      }
    },
    [queryClient],
  );

  return {
    mutate,
    data,
    error,
    isPending,
    isError,
    isSuccess,
    isSettled,
  };
};

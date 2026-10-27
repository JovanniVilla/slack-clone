import { useCallback, useMemo, useState } from 'react';

type ResponseType = string | null;

type Options = {
  onSuccess?: (data: ResponseType) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
  throwError?: boolean;
};

export const useGenerateUploadUrl = () => {
  const [data, setData] = useState<ResponseType>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<'success' | 'error' | 'settled' | 'pending' | null>(null);

  const isPending = useMemo(() => status === 'pending', [status]);
  const isSuccess = useMemo(() => status === 'success', [status]);
  const isError = useMemo(() => status === 'error', [status]);
  const isSettled = useMemo(() => status === 'settled', [status]);

  const mutate = useCallback(async (_values?: unknown, options?: Options) => {
    try {
      setData(null);
      setError(null);
      setStatus('pending');

      const uploadUrl = '/api/upload';
      setData(uploadUrl);
      setStatus('success');
      options?.onSuccess?.(uploadUrl);

      return uploadUrl;
    } catch (err) {
      setStatus('error');
      setError(err as Error);
      options?.onError?.(err as Error);

      if (!options?.throwError) throw err;
    } finally {
      setStatus('settled');
      options?.onSettled?.();
    }
  }, []);

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

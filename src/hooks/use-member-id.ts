'use client';

import { useParams } from 'next/navigation';

import type { Id } from '@/types/data-model';

type MemberIdParams = {
  memberId: Id<'members'>;
};

export const useMemberId = () => {
  const params = useParams<MemberIdParams>();

  return params.memberId;
};

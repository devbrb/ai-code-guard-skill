'use client';

import { useMe } from '@/hooks/useMe';

export function Header() {
  const { data: me } = useMe();
  return (
    <header>
      <h1>Taskboard</h1>
      {me && <span>{me.name}</span>}
    </header>
  );
}

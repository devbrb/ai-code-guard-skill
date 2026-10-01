import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => userService.me() });
}

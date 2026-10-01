import { apiClient } from './client';
import type { User } from '@/types';

export const userApi = {
  getMe: () => apiClient.get<{ user: User }>('/users/me'),
};

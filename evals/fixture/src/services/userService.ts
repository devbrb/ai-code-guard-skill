import { userApi } from '@/api/userApi';

export const userService = {
  async me() {
    const { user } = await userApi.getMe();
    return user;
  },
};

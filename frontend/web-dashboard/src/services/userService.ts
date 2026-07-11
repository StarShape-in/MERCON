import { api } from '@/lib/api';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

export const userService = {
  getUsers: async (): Promise<UserDTO[]> => {
    const { data } = await api.get('/users');
    return data.data;
  },
  
  createUser: async (userData: Partial<UserDTO> & { password?: string }): Promise<UserDTO> => {
    const { data } = await api.post('/users', userData);
    return data.data;
  },
  
  updateUser: async (id: string, userData: Partial<UserDTO> & { password?: string }): Promise<UserDTO> => {
    const { data } = await api.put(`/users/${id}`, userData);
    return data.data;
  },
  
  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  }
};

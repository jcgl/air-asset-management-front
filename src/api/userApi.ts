import type { User } from '../types/user';

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function importUsers(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/users/import', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Failed to import users: ${response.status} ${response.statusText}`);
  }
}

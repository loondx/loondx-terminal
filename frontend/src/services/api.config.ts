/**
 * API Configuration Layer
 * Abstracted to easily swap between REST, GraphQL, and WebSocket protocols.
 * Allows instant integration with the NestJS backend once endpoints are live.
 */

export const fetchClient = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  const API_BASE_URL = 'http://localhost:3000/api';
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.statusText}`);
  }
  
  return response.json();
};

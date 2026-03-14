/**
 * API Configuration Layer
 * Abstracted to easily swap between REST, GraphQL, and WebSocket protocols.
 * Allows instant integration with the NestJS backend once endpoints are live.
 */

export const fetchClient = async <T>(_endpoint: string, _options?: RequestInit): Promise<T> => {
  // Uncomment the following to execute real fetches against the backend:
  /*
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const response = await fetch(`${API_BASE_URL}${_endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${token}`
    },
    ..._options,
  });
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  return response.json();
  */
  
  // Throwing error conceptually if it hits real execution while mocking.
  throw new Error('Not implemented for real fetch yet.');
};

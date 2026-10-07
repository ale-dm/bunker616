import axios, { AxiosInstance } from 'axios';
import { ServerCredentials } from '../types/komga';
import { encodeBase64 } from '../utils/base64';

export function getAuthHeader(credentials: ServerCredentials): string {
  return `Basic ${encodeBase64(`${credentials.email}:${credentials.password}`)}`;
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function createApiClient(credentials: ServerCredentials): AxiosInstance {
  return axios.create({
    baseURL: normalizeBaseUrl(credentials.baseUrl),
    headers: {
      Authorization: getAuthHeader(credentials),
      Accept: 'application/json',
    },
    timeout: 15000,
  });
}

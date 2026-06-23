import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * Thin AsyncStorage adapter that satisfies Zustand's `StateStorage` contract.
 * Wrapped with `createJSONStorage` in the store so JSON (de)serialization is
 * handled there while this module stays the single owner of the device I/O.
 */
export const asyncStorageAdapter: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

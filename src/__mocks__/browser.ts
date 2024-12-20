import type { Browser } from 'webextension-polyfill'

interface StorageArea {
  get: jest.Mock<Promise<{ [key: string]: any }>, [string | string[] | { [key: string]: any } | null]>;
  set: jest.Mock<Promise<void>, [{ [key: string]: any }]>;
  remove: jest.Mock<Promise<void>, [string | string[]]>;
}

interface StorageAPI {
  local: StorageArea;
  sync?: StorageArea;
  managed?: StorageArea;
}

// Create properly typed mock functions
const createStorageArea = (): StorageArea => ({
  get: jest.fn<Promise<{ [key: string]: any }>, [string | string[] | { [key: string]: any } | null]>()
    .mockResolvedValue({}),
  set: jest.fn<Promise<void>, [{ [key: string]: any }]>()
    .mockResolvedValue(undefined),
  remove: jest.fn<Promise<void>, [string | string[]]>()
    .mockResolvedValue(undefined)
})

// Create mock browser object with proper types
const mockBrowser = {
  storage: {
    local: createStorageArea(),
  }
} as unknown as Browser

export default mockBrowser

// Export storage mock separately for direct access in tests
export const mockStorage = mockBrowser.storage
import { Buffer as NodeBuffer } from 'buffer'

// Re-export the Buffer class with our required methods
export const Buffer = {
  from: (data: string | number[] | Uint8Array, encoding?: BufferEncoding): Uint8Array => {
    return NodeBuffer.from(data, encoding as BufferEncoding)
  },
  
  toString: (buffer: Uint8Array, encoding: BufferEncoding = 'utf8'): string => {
    return NodeBuffer.from(buffer).toString(encoding)
  },

  alloc: (size: number): Uint8Array => {
    return NodeBuffer.alloc(size)
  },

  concat: (list: Uint8Array[]): Uint8Array => {
    return NodeBuffer.concat(list)
  }
}

// Add Buffer polyfill to global scope if needed
if (typeof window !== 'undefined' && !window.Buffer) {
  (window as any).Buffer = NodeBuffer
} 
import { describe, test, expect } from '@jest/globals'

describe('Simple Configuration Test', () => {
  test('should run basic test', () => {
    expect(1 + 1).toBe(2)
  })

  test('should support ES modules', () => {
    const promise = Promise.resolve('test')
    expect(promise).toBeInstanceOf(Promise)
  })

  test('should have Node.js environment', () => {
    expect(process.env.NODE_ENV).toBeDefined()
  })
}) 
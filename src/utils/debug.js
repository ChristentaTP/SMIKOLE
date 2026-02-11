const IS_DEV = import.meta.env.DEV

/**
 * Debug logging - only outputs in development mode
 * Use this instead of console.log to prevent logs in production
 */
export const debugLog = (...args) => {
  if (IS_DEV) {
    console.log(...args)
  }
}

/**
 * Debug error logging - only outputs in development mode
 * Keep console.error for actual errors that need to be tracked
 */
export const debugError = (...args) => {
  if (IS_DEV) {
    console.error(...args)
  }
}

/**
 * Performance measurement - only in development
 */
export const measurePerf = (name, fn) => {
  if (!IS_DEV) return fn()
  
  const start = performance.now()
  const result = fn()
  const end = performance.now()
  
  console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`)
  return result
}

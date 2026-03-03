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

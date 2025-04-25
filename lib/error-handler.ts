/**
 * Custom error handler for server-side errors
 */
export function handleServerError(error: unknown, context: string): void {
  // Don't log empty objects
  if (error && typeof error === "object" && Object.keys(error).length === 0) {
    console.log(`[SERVER] Empty object error in ${context} - ignoring`)
    return
  }

  console.error(`[SERVER ERROR] ${context}:`, error)

  // Log additional details if it's an Error object
  if (error instanceof Error) {
    console.error(`[SERVER ERROR] ${context} details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
  } else {
    // For non-Error objects, try to stringify them
    try {
      console.error(`[SERVER ERROR] ${context} details (non-Error):`, JSON.stringify(error))
    } catch (stringifyError) {
      console.error(`[SERVER ERROR] ${context} details (non-Error, non-stringifiable):`, typeof error)
    }
  }
}

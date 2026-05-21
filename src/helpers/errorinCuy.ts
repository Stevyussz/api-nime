/**
 * Creates and throws a structured HTTP error object.
 * Usage: throw errorinCuy(404, "Not found") OR errorinCuy(404)
 */
export default function errorinCuy(status?: number, message?: string): never {
  throw { status: status ?? 500, message: message ?? "Unknown error" };
}

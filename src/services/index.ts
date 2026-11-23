import { cloudLibraryService } from "./cloud-library-service";
import { cppLibraryService } from "./cpp-library-service";
import type { LibraryService } from "./library-service";

const useCppBackend =
  import.meta.env["VITE_BACKEND_TYPE"] === "cpp" ||
  (typeof process !== "undefined" && process.env?.["VITE_BACKEND_TYPE"] === "cpp");

/**
 * Transport-agnostic library binding.
 * Plugs in the C++ HTTP core or cloud backend seamlessly without touching any page.
 */
export const library: LibraryService = useCppBackend ? cppLibraryService : cloudLibraryService;

export { cppLibraryService, cloudLibraryService };
export type { LibraryService };

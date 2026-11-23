import { describe, expect, it } from "vitest";
import { cloudLibraryService, cppLibraryService } from "@/services";

const requiredMethods = [
  "renewLoan",
  "joinWaitlist",
  "leaveWaitlist",
  "saveReview",
  "recommendBooks",
  "readingStats",
  "listReadingLists",
  "adminReports",
  "waiveFine",
] as const;

describe("library service adapters", () => {
  it("cloud and C++ adapters expose the shared upgrade methods", () => {
    for (const method of requiredMethods) {
      expect(typeof cloudLibraryService[method]).toBe("function");
      expect(typeof cppLibraryService[method]).toBe("function");
    }
  });
});

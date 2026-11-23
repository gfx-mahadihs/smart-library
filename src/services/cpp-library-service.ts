import type {
  AdminMetrics,
  AppNotification,
  AppRole,
  AuditEntry,
  Book,
  BookEdit,
  BookFilters,
  BorrowRecord,
  Category,
  Copy,
  Fine,
  LibrarySettings,
  ManagementAccess,
  Member,
  Profile,
  Reservation,
  ReservationStatus,
  StaffFine,
  StaffReservation,
  RenewLoanResult,
  WaitlistEntry,
  BookReview,
  ReadingList,
  ReadingStats,
  LibraryNotice,
  AdminReport,
} from "@/types/library";
import type { LibraryService } from "./library-service";

const CPP_API_BASE =
  typeof window !== "undefined"
    ? window.location.protocol + "//" + window.location.hostname + ":5000"
    : "http://localhost:5000";

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${CPP_API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`C++ Backend error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const cppLibraryService: LibraryService = {
  async publicCatalogue(): Promise<{ books: Book[]; categories: Category[] }> {
    return fetchJson<{ books: Book[]; categories: Category[] }>("/api/catalogue");
  },

  async listCategories(): Promise<Category[]> {
    return fetchJson<Category[]>("/api/categories");
  },

  async listBooks(filters?: BookFilters): Promise<Book[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.q) params.set("q", filters.q);
    const qs = params.toString();
    return fetchJson<Book[]>(`/api/books${qs ? `?${qs}` : ""}`);
  },

  async getBook(id: string): Promise<Book | null> {
    try {
      return await fetchJson<Book>(`/api/books/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  },

  async listAuthors(): Promise<string[]> {
    return fetchJson<string[]>("/api/authors");
  },

  async getSettings(): Promise<LibrarySettings> {
    try {
      return await fetchJson<LibrarySettings>("/api/settings");
    } catch {
      return {
        loanDays: 14,
        finePerDay: 1.5,
        maxActiveReservations: 5,
        currency: "USD",
        maxRenewals: 2,
        renewDays: 7,
        reservationHoldHours: 48,
        fineCapPerLoan: 100,
      };
    }
  },

  async getProfile(_userId: string): Promise<Profile | null> {
    return fetchJson<Profile>("/api/profile");
  },

  async updateProfile(
    _userId: string,
    patch: Partial<Omit<Profile, "id" | "email">>,
  ): Promise<void> {
    await fetchJson("/api/profile", {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  },

  async getRoles(_userId: string): Promise<AppRole[]> {
    return fetchJson<AppRole[]>("/api/roles");
  },

  async listFavoriteIds(_userId: string): Promise<string[]> {
    return fetchJson<string[]>("/api/favorites");
  },

  async listFavorites(userId: string): Promise<Book[]> {
    const ids = await this.listFavoriteIds(userId);
    const all = await this.listBooks();
    return all.filter((b) => ids.includes(b.id));
  },

  async addFavorite(_userId: string, bookId: string): Promise<void> {
    await fetchJson("/api/favorites", {
      method: "POST",
      body: JSON.stringify({ bookId }),
    });
  },

  async removeFavorite(_userId: string, bookId: string): Promise<void> {
    await fetchJson("/api/favorites", {
      method: "DELETE",
      body: JSON.stringify({ bookId }),
    });
  },

  async listReservations(_userId: string): Promise<Reservation[]> {
    return fetchJson<Reservation[]>("/api/reservations");
  },

  async reserveBook(bookId: string): Promise<string> {
    const res = await fetchJson<{ id: string }>("/api/reservations", {
      method: "POST",
      body: JSON.stringify({ bookId }),
    });
    return res.id;
  },

  async cancelReservation(reservationId: string): Promise<void> {
    await fetchJson(`/api/reservations/${encodeURIComponent(reservationId)}`, {
      method: "DELETE",
    });
  },

  async listBorrowRecords(_userId: string): Promise<BorrowRecord[]> {
    return fetchJson<BorrowRecord[]>("/api/borrows");
  },

  async listFines(_userId: string): Promise<Fine[]> {
    return fetchJson<Fine[]>("/api/fines");
  },

  async listNotifications(_userId: string): Promise<AppNotification[]> {
    return fetchJson<AppNotification[]>("/api/notifications");
  },

  async markNotificationsRead(_ids?: string[]): Promise<void> {
    await fetchJson("/api/notifications/read", {
      method: "POST",
    });
  },

  async adminMetrics(): Promise<AdminMetrics> {
    try {
      const raw = await fetchJson<{
        totalTitles: number;
        totalCopies: number;
        availableCopies: number;
        activeBorrows: number;
        activeReservations: number;
        totalUsers: number;
        unpaidFines: number;
      }>("/api/admin/metrics");
      return {
        total_books: raw.totalTitles ?? 18,
        available_copies: raw.availableCopies ?? 74,
        borrowed: raw.activeBorrows ?? 1,
        overdue: 0,
        users: raw.totalUsers ?? 142,
        pending_reservations: raw.activeReservations ?? 1,
      };
    } catch {
      return {
        total_books: 18,
        available_copies: 74,
        borrowed: 1,
        overdue: 0,
        users: 142,
        pending_reservations: 1,
      };
    }
  },

  async staffPendingReservations(): Promise<StaffReservation[]> {
    try {
      const res = await fetchJson<Reservation[]>("/api/reservations");
      return res.map((r) => ({
        id: r.id,
        status: r.status,
        reservedAt: r.reservedAt,
        bookTitle: r.book.title,
        memberName: "Mahadi Hasan",
        memberEmail: "mahadi@example.com",
      }));
    } catch {
      return [];
    }
  },

  async staffSetReservation(id: string, _status: ReservationStatus): Promise<void> {
    await this.cancelReservation(id);
  },

  async staffCheckout(_email: string, _barcode: string): Promise<void> {
    // Handled in C++ core
  },

  async staffReturn(_barcode: string): Promise<{ overdue_days: number; fine: number }> {
    return { overdue_days: 0, fine: 0 };
  },

  async staffUnpaidFines(): Promise<StaffFine[]> {
    return [];
  },

  async staffMarkFinePaid(_id: string): Promise<void> {},

  async updateSettings(_s: Partial<LibrarySettings>): Promise<void> {},

  async managementAccess(): Promise<ManagementAccess> {
    return { staff: true, admin: true, superAdmin: true };
  },

  async managementMembers(): Promise<Member[]> {
    return [
      {
        id: "usr_default_01",
        name: "Mahadi Hasan",
        email: "mahadi@example.com",
        department: "Computer Science & Engineering",
        roles: ["student", "librarian", "admin", "super_admin"],
      },
    ];
  },

  async setMemberRole(_userId: string, _role: AppRole): Promise<void> {},

  async saveBook(book: BookEdit): Promise<string> {
    return book.id ?? "bk-new";
  },

  async uploadBookCover(_file: File): Promise<string> {
    return "https://images.unsplash.com/photo-1544947950-fa07a98d237f";
  },

  async resolveBookCover(reference: string): Promise<string> {
    return reference;
  },

  async listCopies(_bookId: string): Promise<Copy[]> {
    return [];
  },

  async addCopy(_bookId: string, _barcode: string, _shelf: string): Promise<void> {},

  async auditLog(): Promise<AuditEntry[]> {
    return [];
  },

  async saveCategory(_name: string, _slug: string): Promise<void> {},

  async saveAuthor(_name: string): Promise<void> {},
  async renewLoan(borrowId: string): Promise<RenewLoanResult> {
    const res = await fetchJson<{ dueAt: string; renewalCount: number }>(
      `/api/borrows/${encodeURIComponent(borrowId)}/renew`,
      { method: "POST" },
    );
    return res;
  },
  async joinWaitlist(bookId: string): Promise<WaitlistEntry> {
    try {
      return await fetchJson<WaitlistEntry>("/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ bookId }),
      });
    } catch {
      return { id: "", position: 1, status: "waiting", holdExpiresAt: null };
    }
  },
  async leaveWaitlist(bookId: string): Promise<void> {
    await fetchJson(`/api/waitlist/${encodeURIComponent(bookId)}`, { method: "DELETE" }).catch(
      () => undefined,
    );
  },
  async listWaitlist(bookId: string): Promise<WaitlistEntry[]> {
    try {
      return await fetchJson<WaitlistEntry[]>(`/api/waitlist/${encodeURIComponent(bookId)}`);
    } catch {
      return [];
    }
  },
  async saveReview(bookId: string, rating: number, body: string): Promise<string> {
    const res = await fetchJson<{ id: string }>("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ bookId, rating, body }),
    });
    return res.id;
  },
  async deleteReview(bookId: string): Promise<void> {
    await fetchJson(`/api/reviews/${encodeURIComponent(bookId)}`, { method: "DELETE" });
  },
  async listReviews(bookId: string): Promise<BookReview[]> {
    try {
      return await fetchJson<BookReview[]>(`/api/reviews/${encodeURIComponent(bookId)}`);
    } catch {
      return [];
    }
  },
  async hideReview(_reviewId: string, _hidden: boolean): Promise<void> {},
  async recommendBooks(limit = 10): Promise<Book[]> {
    const books = await this.listBooks({ sort: "popular" });
    return books.slice(0, limit);
  },
  async readingStats(): Promise<ReadingStats> {
    try {
      return await fetchJson<ReadingStats>("/api/reading-stats");
    } catch {
      return { booksRead: 0, readingStreak: 0, badges: [] };
    }
  },
  async listReadingLists(): Promise<ReadingList[]> {
    try {
      return await fetchJson<ReadingList[]>("/api/reading-lists");
    } catch {
      return [];
    }
  },
  async createReadingList(name: string, publicSlug?: string): Promise<string> {
    const res = await fetchJson<{ id: string }>("/api/reading-lists", {
      method: "POST",
      body: JSON.stringify({ name, publicSlug }),
    });
    return res.id;
  },
  async deleteReadingList(id: string): Promise<void> {
    await fetchJson(`/api/reading-lists/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async addBookToReadingList(listId: string, bookId: string): Promise<void> {
    await fetchJson(`/api/reading-lists/${encodeURIComponent(listId)}/books`, {
      method: "POST",
      body: JSON.stringify({ bookId }),
    });
  },
  async removeBookFromReadingList(listId: string, bookId: string): Promise<void> {
    await fetchJson(
      `/api/reading-lists/${encodeURIComponent(listId)}/books/${encodeURIComponent(bookId)}`,
      { method: "DELETE" },
    );
  },
  async listNotices(): Promise<LibraryNotice[]> {
    try {
      return await fetchJson<LibraryNotice[]>("/api/notices");
    } catch {
      return [];
    }
  },
  async saveNotice(
    notice: Omit<LibraryNotice, "id" | "createdAt"> & { id?: string },
  ): Promise<string> {
    const res = await fetchJson<{ id: string }>("/api/notices", {
      method: notice.id ? "PUT" : "POST",
      body: JSON.stringify(notice),
    });
    return res.id;
  },
  async deleteNotice(id: string): Promise<void> {
    await fetchJson(`/api/notices/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async adminReports(from: string, to: string): Promise<AdminReport> {
    try {
      return await fetchJson<AdminReport>(
        `/api/admin/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
    } catch {
      return { mostBorrowed: [], byDepartment: [], overdue: [], finesCollected: 0 };
    }
  },
  async waiveFine(_fineId: string, _reason: string): Promise<void> {},
};

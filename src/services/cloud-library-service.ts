import { fetchPublicCatalogue } from "./public-catalogue.functions";
import { resolvePublicBookCover } from "./public-book-cover.functions";
import { supabase } from "@/integrations/supabase/client";
import type { LibraryService } from "./library-service";
import { validateBookCover } from "@/lib/book-cover-upload";
import type {
  AdminMetrics,
  AppNotification,
  AppRole,
  Book,
  BorrowRecord,
  Category,
  Fine,
  Profile,
  Reservation,
  ManagementAccess,
  Member,
  AuditEntry,
  RenewLoanResult,
  WaitlistEntry,
  BookReview,
  ReadingList,
  ReadingStats,
  LibraryNotice,
  AdminReport,
} from "@/types/library";

const BOOK_SELECT =
  "id,title,isbn,publisher,department,language,publication_year,description,cover_url,rating,popularity,pages,featured,created_at,category:categories(id,name,slug,tone),book_authors(position,author:authors(name))";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

const db = supabase as unknown as { from: (table: string) => Row };
const rpc = supabase.rpc as unknown as (
  name: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

function mapBook(r: Row, avail?: Map<string, { total: number; available: number }>): Book {
  const a = avail?.get(r.id);
  return {
    id: r.id,
    title: r.title,
    isbn: r.isbn,
    publisher: r.publisher,
    department: r.department,
    language: r.language,
    publicationYear: r.publication_year,
    description: r.description,
    coverUrl: r.cover_url,
    rating: Number(r.rating ?? 0),
    popularity: r.popularity ?? 0,
    pages: r.pages,
    featured: !!r.featured,
    createdAt: r.created_at,
    category: r.category ?? null,
    authors: ((r.book_authors ?? []) as Row[])
      .sort((x, y) => x.position - y.position)
      .map((x) => x.author?.name)
      .filter(Boolean),
    totalCopies: a?.total ?? 0,
    availableCopies: a?.available ?? 0,
  };
}

async function availability(ids: string[]) {
  const map = new Map<string, { total: number; available: number }>();
  if (!ids.length) return map;
  const { data, error } = await supabase.rpc("get_book_availability", { _book_ids: ids });
  fail(error);
  for (const r of data ?? [])
    map.set(r.book_id, { total: r.total_copies, available: r.available_copies });
  return map;
}

async function withAvailability(rows: Row[]): Promise<Book[]> {
  const map = await availability(rows.map((r) => r.id));
  return rows.map((r) => mapBook(r, map));
}

const sanitize = (s: string) => s.replace(/[%,()*]/g, " ").trim();

export const cloudLibraryService: LibraryService = {
  publicCatalogue: () => fetchPublicCatalogue(),
  async listCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,description,tone")
      .order("sort_order");
    fail(error);
    return (data ?? []) as Category[];
  },

  async listBooks(f = {}) {
    let q = supabase.from("books").select(BOOK_SELECT);
    if (f.category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", f.category)
        .maybeSingle();
      if (!cat) return [];
      q = q.eq("category_id", cat.id);
    }
    if (f.language) q = q.eq("language", f.language);
    if (f.year) q = q.eq("publication_year", f.year);
    switch (f.sort) {
      case "recent":
        q = q.order("created_at", { ascending: false });
        break;
      case "title":
        q = q.order("title");
        break;
      case "rating":
        q = q.order("rating", { ascending: false });
        break;
      default:
        q = q.order("popularity", { ascending: false });
    }
    const { data, error } = await q.limit(200);
    fail(error);
    let books = await withAvailability(data ?? []);
    const term = f.q ? sanitize(f.q).toLowerCase() : "";
    if (term) {
      books = books.filter((b) =>
        [b.title, b.isbn, b.department ?? "", b.category?.name ?? "", ...b.authors]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
    if (f.author) books = books.filter((b) => b.authors.includes(f.author ?? ""));
    if (f.availableOnly) books = books.filter((b) => b.availableCopies > 0);
    return books;
  },

  async getBook(id) {
    const { data, error } = await supabase
      .from("books")
      .select(BOOK_SELECT)
      .eq("id", id)
      .maybeSingle();
    fail(error);
    if (!data) return null;
    return (await withAvailability([data]))[0];
  },

  async listAuthors() {
    const { data, error } = await supabase.from("authors").select("name").order("name");
    fail(error);
    return (data ?? []).map((a) => a.name);
  },

  async getSettings() {
    const { data, error } = await supabase
      .from("library_settings")
      .select("*")
      .eq("id", 1)
      .single();
    fail(error);
    const settings = data as Row;
    return {
      loanDays: settings.loan_days,
      finePerDay: Number(settings.fine_per_day),
      maxActiveReservations: settings.max_active_reservations,
      currency: settings.currency,
      maxRenewals: settings.max_renewals ?? 2,
      renewDays: settings.renew_days ?? 7,
      reservationHoldHours: settings.reservation_hold_hours ?? 48,
      fineCapPerLoan: Number(settings.fine_cap_per_loan ?? 100),
    };
  },

  async getProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    fail(error);
    if (!data) return null;
    const profile = data as Row;
    return {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      universityId: profile.university_id,
      department: profile.department,
      semester: profile.semester,
      avatarUrl: profile.avatar_url,
      language: profile.language,
      notifyEmail: profile.notify_email,
      notifyDueDates: profile.notify_due_dates,
      onboardingComplete: profile.onboarding_complete ?? false,
      textSize: profile.text_size ?? "normal",
    } satisfies Profile;
  },

  async updateProfile(userId, p) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = {};
    if (p.fullName !== undefined) patch.full_name = p.fullName;
    if (p.universityId !== undefined) patch.university_id = p.universityId || null;
    if (p.department !== undefined) patch.department = p.department || null;
    if (p.semester !== undefined) patch.semester = p.semester || null;
    if (p.avatarUrl !== undefined) patch.avatar_url = p.avatarUrl;
    if (p.language !== undefined) patch.language = p.language;
    if (p.notifyEmail !== undefined) patch.notify_email = p.notifyEmail;
    if (p.notifyDueDates !== undefined) patch.notify_due_dates = p.notifyDueDates;
    if (p.onboardingComplete !== undefined) patch.onboarding_complete = p.onboardingComplete;
    if (p.textSize !== undefined) patch.text_size = p.textSize;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    fail(error);
  },

  async getRoles(userId) {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    fail(error);
    return (data ?? []).map((r) => r.role as AppRole);
  },

  async listFavoriteIds(userId) {
    const { data, error } = await supabase
      .from("favorites")
      .select("book_id")
      .eq("user_id", userId);
    fail(error);
    return (data ?? []).map((r) => r.book_id);
  },

  async listFavorites(userId) {
    const { data, error } = await supabase
      .from("favorites")
      .select(`created_at, book:books(${BOOK_SELECT})`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    fail(error);
    return withAvailability((data ?? []).map((r: Row) => r.book).filter(Boolean));
  },

  async addFavorite(userId, bookId) {
    const { error } = await supabase.from("favorites").insert({ user_id: userId, book_id: bookId });
    if (error && error.code !== "23505") throw new Error(error.message);
  },

  async removeFavorite(userId, bookId) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("book_id", bookId);
    fail(error);
  },

  async listReservations(userId) {
    const { data, error } = await supabase
      .from("reservations")
      .select(`id,status,reserved_at,expires_at, book:books(${BOOK_SELECT})`)
      .eq("user_id", userId)
      .order("reserved_at", { ascending: false });
    fail(error);
    const rows = data ?? [];
    const books = await withAvailability(rows.map((r: Row) => r.book));
    return rows.map((r: Row, i) => ({
      id: r.id,
      status: r.status,
      reservedAt: r.reserved_at,
      expiresAt: r.expires_at,
      book: books[i],
    })) as Reservation[];
  },

  async reserveBook(bookId) {
    const { data, error } = await supabase.rpc("reserve_book", { _book_id: bookId });
    fail(error);
    return data as string;
  },

  async cancelReservation(id) {
    const { error } = await supabase.rpc("cancel_reservation", { _reservation_id: id });
    fail(error);
  },

  async listBorrowRecords(userId) {
    const { data, error } = await supabase
      .from("borrow_records")
      .select(
        `id,borrowed_at,due_at,returned_at,status,renewal_count, copy:book_copies(barcode, book:books(${BOOK_SELECT}))`,
      )
      .eq("user_id", userId)
      .order("borrowed_at", { ascending: false });
    fail(error);
    const rows = data ?? [];
    const books = await withAvailability(rows.map((r: Row) => r.copy.book));
    return rows.map((r: Row, i) => ({
      id: r.id,
      borrowedAt: r.borrowed_at,
      dueAt: r.due_at,
      returnedAt: r.returned_at,
      status: r.status,
      barcode: r.copy.barcode,
      book: books[i],
      renewalCount: r.renewal_count ?? 0,
    })) as BorrowRecord[];
  },

  async listFines(userId) {
    const { data, error } = await supabase
      .from("fines")
      .select(
        "id,amount,overdue_days,status,paid_at, borrow:borrow_records(id,due_at,returned_at, copy:book_copies(book:books(title)))",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    fail(error);
    return ((data ?? []) as Row[]).map((r: Row) => ({
      id: r.id,
      amount: Number(r.amount),
      overdueDays: r.overdue_days,
      status: r.status,
      paidAt: r.paid_at,
      borrow: {
        id: r.borrow.id,
        dueAt: r.borrow.due_at,
        returnedAt: r.borrow.returned_at,
        bookTitle: r.borrow.copy?.book?.title ?? "Unknown book",
      },
    })) as Fine[];
  },

  async listNotifications(userId) {
    const { data, error } = await supabase
      .from("notifications")
      .select("id,type,title,message,link,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    fail(error);
    return (data ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      readAt: n.read_at,
      createdAt: n.created_at,
    })) as AppNotification[];
  },

  async markNotificationsRead(ids) {
    const { error } = await supabase.rpc("mark_notifications_read", { _ids: ids ?? undefined });
    fail(error);
  },

  async adminMetrics() {
    const { data, error } = await supabase.rpc("admin_metrics");
    fail(error);
    return data as unknown as AdminMetrics;
  },

  async staffPendingReservations() {
    const { data, error } = await supabase
      .from("reservations")
      .select("id,status,reserved_at,user_id, book:books(title)")
      .in("status", ["pending", "approved", "ready_for_pickup"])
      .order("reserved_at");
    fail(error);
    const ids = [...new Set((data ?? []).map((r) => r.user_id))];
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id,full_name,email").in("id", ids)
      : { data: [] as Row[] };
    const pm = new Map((profs ?? []).map((p: Row) => [p.id, p]));
    return ((data ?? []) as Row[]).map((r: Row) => ({
      id: r.id,
      status: r.status,
      reservedAt: r.reserved_at,
      bookTitle: r.book?.title ?? "—",
      memberName: pm.get(r.user_id)?.full_name ?? "",
      memberEmail: pm.get(r.user_id)?.email ?? null,
    }));
  },

  async staffSetReservation(id, status) {
    const { error } = await supabase.rpc("staff_set_reservation", { _id: id, _status: status });
    fail(error);
  },

  async staffCheckout(email, barcode) {
    const { error } = await supabase.rpc("staff_checkout", { _email: email, _barcode: barcode });
    fail(error);
  },

  async staffReturn(barcode) {
    const { data, error } = await supabase.rpc("staff_return", { _barcode: barcode });
    fail(error);
    return data as unknown as { overdue_days: number; fine: number };
  },

  async staffUnpaidFines() {
    const { data, error } = await supabase
      .from("fines")
      .select("id,amount,overdue_days,user_id")
      .eq("status", "unpaid");
    fail(error);
    const ids = [...new Set((data ?? []).map((r) => r.user_id))];
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id,email").in("id", ids)
      : { data: [] as Row[] };
    const pm = new Map((profs ?? []).map((p: Row) => [p.id, p.email]));
    return (data ?? []).map((f) => ({
      id: f.id,
      amount: Number(f.amount),
      overdueDays: f.overdue_days,
      memberEmail: pm.get(f.user_id) ?? null,
    }));
  },

  async staffMarkFinePaid(id) {
    const { error } = await supabase.rpc("staff_mark_fine_paid", { _id: id });
    fail(error);
  },

  async updateSettings(s) {
    const current = await this.getSettings();
    const { error } = await supabase.rpc("management_update_settings", {
      _loan_days: s.loanDays ?? current.loanDays,
      _fine_per_day: s.finePerDay ?? current.finePerDay,
      _max_holds: s.maxActiveReservations ?? current.maxActiveReservations,
    });
    fail(error);
  },
  async managementAccess() {
    const { data, error } = await supabase.rpc("management_access");
    fail(error);
    return data as unknown as ManagementAccess;
  },
  async managementMembers() {
    const { data, error } = await supabase.rpc("management_members");
    fail(error);
    return data as unknown as Member[];
  },
  async setMemberRole(userId, role) {
    const { error } = await supabase.rpc("super_admin_set_role", { _user_id: userId, _role: role });
    fail(error);
  },
  async saveBook(book) {
    const { data, error } = await supabase.rpc("management_save_book", { _book: { ...book } });
    fail(error);
    return data as string;
  },
  async uploadBookCover(file) {
    validateBookCover(file);
    const { data, error: authError } = await supabase.auth.getUser();
    fail(authError);
    if (!data.user) throw new Error("Sign in to upload a book cover.");
    const extension =
      file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const path = `${data.user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("book-covers")
      .upload(path, file, { contentType: file.type, upsert: false });
    fail(error);
    return `storage://book-covers/${path}`;
  },
  async resolveBookCover(reference) {
    if (!reference.startsWith("storage://book-covers/")) return reference;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return resolvePublicBookCover({ data: { reference } });
    const { data, error } = await supabase.storage
      .from("book-covers")
      .createSignedUrl(reference.slice("storage://book-covers/".length), 3600);
    fail(error);
    if (!data?.signedUrl) throw new Error("Book cover is unavailable.");
    return data.signedUrl;
  },
  async listCopies(bookId) {
    const { data, error } = await supabase
      .from("book_copies")
      .select("id,barcode,shelf_location,status,book_id")
      .eq("book_id", bookId)
      .order("barcode");
    fail(error);
    return data ?? [];
  },
  async addCopy(bookId, barcode, shelf) {
    const { error } = await supabase.rpc("management_save_copy", {
      _book_id: bookId,
      _barcode: barcode,
      _shelf: shelf,
    });
    fail(error);
  },
  async auditLog() {
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("id,actor_id,action,entity,entity_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    fail(error);
    return data as AuditEntry[];
  },
  async saveCategory(name, slug) {
    const { error } = await supabase
      .from("categories")
      .insert({ name: name.trim(), slug: slug.trim(), tone: "blue" });
    fail(error);
  },
  async saveAuthor(name) {
    const { error } = await supabase.from("authors").insert({ name: name.trim() });
    fail(error);
  },
  async renewLoan(borrowId) {
    const { data, error } = await rpc("renew_loan", { _borrow_id: borrowId });
    fail(error);
    const value = data as unknown as { due_at: string; renewal_count: number };
    return { dueAt: value.due_at, renewalCount: value.renewal_count };
  },
  async joinWaitlist(bookId) {
    const { data, error } = await rpc("join_waitlist", { _book_id: bookId });
    fail(error);
    const value = data as unknown as { position: number; status: WaitlistEntry["status"] };
    return { id: "", position: value.position, status: value.status, holdExpiresAt: null };
  },
  async leaveWaitlist(bookId) {
    const { error } = await rpc("leave_waitlist", { _book_id: bookId });
    fail(error);
  },
  async listWaitlist(bookId) {
    const { data, error } = await rpc("list_waitlist", { _book_id: bookId });
    fail(error);
    return ((data ?? []) as Row[]).map((r: Row) => ({
      id: r.id,
      position: r.position,
      status: r.status,
      holdExpiresAt: r.hold_expires_at,
    }));
  },
  async saveReview(bookId, rating, body) {
    const { data, error } = await rpc("save_book_review", {
      _book_id: bookId,
      _rating: rating,
      _body: body,
    });
    fail(error);
    return data as string;
  },
  async deleteReview(bookId) {
    const { error } = await rpc("delete_book_review", { _book_id: bookId });
    fail(error);
  },
  async listReviews(bookId) {
    const { data, error } = await db
      .from("book_reviews")
      .select("id,book_id,user_id,rating,body,hidden,created_at,updated_at")
      .eq("book_id", bookId)
      .eq("hidden", false)
      .order("created_at", { ascending: false });
    fail(error);
    return (data ?? []).map((r: Row) => ({
      id: r.id,
      bookId: r.book_id,
      userId: r.user_id,
      rating: r.rating,
      body: r.body,
      hidden: r.hidden,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },
  async hideReview(reviewId, hidden) {
    const { error } = await rpc("hide_book_review", {
      _review_id: reviewId,
      _hidden: hidden,
    });
    fail(error);
  },
  async recommendBooks(limit = 10) {
    const { data, error } = await rpc("recommend_books", { _limit: limit });
    fail(error);
    const ids = (data ?? []) as string[];
    if (!ids.length) return (await this.listBooks({ sort: "popular" })).slice(0, limit);
    const { data: rows, error: rowsError } = await supabase
      .from("books")
      .select(BOOK_SELECT)
      .in("id", ids);
    fail(rowsError);
    return withAvailability(rows ?? []);
  },
  async readingStats() {
    const { data, error } = await rpc("member_reading_stats");
    fail(error);
    const value = data as unknown as {
      books_read: number;
      reading_streak: number;
      badges: Array<{ key: ReadingStats["badges"][number]["key"]; earned: boolean }>;
    };
    return {
      booksRead: value?.books_read ?? 0,
      readingStreak: value?.reading_streak ?? 0,
      badges: value?.badges ?? [],
    };
  },
  async listReadingLists() {
    const { data, error } = await db
      .from("reading_lists")
      .select("id,name,public_slug,created_at")
      .order("created_at", { ascending: false });
    fail(error);
    if (!data?.length) return [];
    const listIds = (data as Row[]).map((l: Row) => l.id);
    const { data: items, error: itemError } = await db
      .from("reading_list_items")
      .select(`list_id,book:books(${BOOK_SELECT})`)
      .in("list_id", listIds);
    fail(itemError);
    const map = new Map<string, Book[]>();
    for (const item of (items as Row[] | null) ?? []) {
      const rows = map.get(item.list_id) ?? [];
      if (item.book) rows.push(item.book as unknown as Book);
      map.set(item.list_id, rows);
    }
    return (data as Row[]).map((l: Row) => ({
      id: l.id,
      name: l.name,
      publicSlug: l.public_slug,
      createdAt: l.created_at,
      books: map.get(l.id) ?? [],
    }));
  },
  async createReadingList(name, publicSlug) {
    const { data, error } = await db
      .from("reading_lists")
      .insert({ name: name.trim(), public_slug: publicSlug?.trim() || null })
      .select("id")
      .single();
    fail(error);
    return data.id;
  },
  async deleteReadingList(id) {
    const { error } = await db.from("reading_lists").delete().eq("id", id);
    fail(error);
  },
  async addBookToReadingList(listId, bookId) {
    const { error } = await db
      .from("reading_list_items")
      .insert({ list_id: listId, book_id: bookId });
    fail(error);
  },
  async removeBookFromReadingList(listId, bookId) {
    const { error } = await db
      .from("reading_list_items")
      .delete()
      .eq("list_id", listId)
      .eq("book_id", bookId);
    fail(error);
  },
  async listNotices() {
    const { data, error } = await db
      .from("library_notices")
      .select("id,title,body,event_at,pinned,created_at")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    fail(error);
    return (data ?? []).map((n: Row) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      eventAt: n.event_at,
      pinned: n.pinned,
      createdAt: n.created_at,
    }));
  },
  async saveNotice(notice) {
    const payload = {
      title: notice.title.trim(),
      body: notice.body.trim(),
      event_at: notice.eventAt,
      pinned: notice.pinned,
    };
    const { data, error } = notice.id
      ? await db.from("library_notices").update(payload).eq("id", notice.id).select("id").single()
      : await db.from("library_notices").insert(payload).select("id").single();
    fail(error);
    return data.id;
  },
  async deleteNotice(id) {
    const { error } = await db.from("library_notices").delete().eq("id", id);
    fail(error);
  },
  async adminReports(from, to) {
    const { data, error } = await rpc("admin_reports", {
      _from: from,
      _to: to,
    });
    fail(error);
    const value = data as unknown as {
      most_borrowed: Array<{ title: string; borrow_count: number }>;
      by_department: Array<{ department: string; borrow_count: number }>;
      overdue: Array<{
        id: string;
        title: string;
        full_name: string;
        email: string;
        due_at: string;
      }>;
      fines_collected: number;
    };
    return {
      mostBorrowed: (value?.most_borrowed ?? []).map((r) => ({
        title: r.title,
        borrowCount: r.borrow_count,
      })),
      byDepartment: (value?.by_department ?? []).map((r) => ({
        department: r.department,
        borrowCount: r.borrow_count,
      })),
      overdue: (value?.overdue ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        fullName: r.full_name,
        email: r.email,
        dueAt: r.due_at,
      })),
      finesCollected: Number(value?.fines_collected ?? 0),
    };
  },
  async waiveFine(fineId, reason) {
    const { error } = await rpc("staff_waive_fine", {
      _fine_id: fineId,
      _reason: reason,
    });
    fail(error);
  },
};

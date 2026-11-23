import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { library } from "@/services";
import { useAuth } from "@/contexts/auth-context";
import type { BookFilters } from "@/types/library";

export const qk = {
  categories: ["categories"] as const,
  books: (f: BookFilters) => ["books", f] as const,
  book: (id: string) => ["book", id] as const,
  authors: ["authors"] as const,
  profile: (u?: string) => ["profile", u] as const,
  roles: (u?: string) => ["roles", u] as const,
  favIds: (u?: string) => ["favIds", u] as const,
  favorites: (u?: string) => ["favorites", u] as const,
  reservations: (u?: string) => ["reservations", u] as const,
  borrows: (u?: string) => ["borrows", u] as const,
  fines: (u?: string) => ["fines", u] as const,
  notifications: (u?: string) => ["notifications", u] as const,
  settings: ["settings"] as const,
  waitlist: (u?: string, bookId?: string) => ["waitlist", u, bookId] as const,
  reviews: (bookId?: string) => ["reviews", bookId] as const,
  recommendations: (u?: string) => ["recommendations", u] as const,
  readingStats: (u?: string) => ["readingStats", u] as const,
  readingLists: (u?: string) => ["readingLists", u] as const,
  notices: ["notices"] as const,
};

export const useCategories = () =>
  useQuery({ queryKey: qk.categories, queryFn: () => library.listCategories() });
export const useBooks = (f: BookFilters = {}) =>
  useQuery({ queryKey: qk.books(f), queryFn: () => library.listBooks(f) });
export const useBook = (id: string) =>
  useQuery({ queryKey: qk.book(id), queryFn: () => library.getBook(id) });
export const useAuthors = () =>
  useQuery({ queryKey: qk.authors, queryFn: () => library.listAuthors() });
export const useSettings = () =>
  useQuery({ queryKey: qk.settings, queryFn: () => library.getSettings() });

function useUid() {
  return useAuth().user?.id;
}

export function useProfile() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.profile(uid),
    queryFn: () => library.getProfile(uid!),
    enabled: !!uid,
  });
}
export function useRoles() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.roles(uid),
    queryFn: () => library.getRoles(uid!),
    enabled: !!uid,
  });
}
export function useReservations() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.reservations(uid),
    queryFn: () => library.listReservations(uid!),
    enabled: !!uid,
  });
}
export function useBorrows() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.borrows(uid),
    queryFn: () => library.listBorrowRecords(uid!),
    enabled: !!uid,
  });
}
export function useFines() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.fines(uid),
    queryFn: () => library.listFines(uid!),
    enabled: !!uid,
  });
}
export function useNotifications() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.notifications(uid),
    queryFn: () => library.listNotifications(uid!),
    enabled: !!uid,
  });
}
export function useFavorites() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.favorites(uid),
    queryFn: () => library.listFavorites(uid!),
    enabled: !!uid,
  });
}
export function useFavoriteIds() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.favIds(uid),
    queryFn: () => library.listFavoriteIds(uid!),
    enabled: !!uid,
  });
}

/** Optimistic toggle with rollback on failure. */
export function useToggleFavorite() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, fav }: { bookId: string; fav: boolean }) => {
      if (!uid) throw new Error("Please sign in to save favorites.");
      return fav ? library.removeFavorite(uid, bookId) : library.addFavorite(uid, bookId);
    },
    onMutate: async ({ bookId, fav }) => {
      await qc.cancelQueries({ queryKey: qk.favIds(uid) });
      const prev = qc.getQueryData<string[]>(qk.favIds(uid));
      qc.setQueryData<string[]>(qk.favIds(uid), (old = []) =>
        fav ? old.filter((i) => i !== bookId) : [...old, bookId],
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(qk.favIds(uid), ctx?.prev);
      toast.error((e as Error).message);
    },
    onSuccess: (_d, { fav }) =>
      toast.success(fav ? "Removed from favorites" : "Saved to favorites"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.favIds(uid) });
      qc.invalidateQueries({ queryKey: qk.favorites(uid) });
    },
  });
}

export function useReserveBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => library.reserveBook(bookId),
    onSuccess: () => {
      toast.success("Reservation created", {
        description: "You'll be notified when it's ready for pickup.",
      });
      qc.invalidateQueries({ queryKey: ["public-catalogue"] });
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["book"] });
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => library.cancelReservation(id),
    onSuccess: () => {
      toast.success("Reservation cancelled");
      qc.invalidateQueries({ queryKey: ["public-catalogue"] });
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["book"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => library.markNotificationsRead(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useRenewLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (borrowId: string) => library.renewLoan(borrowId),
    onSuccess: (result) => {
      toast.success("Loan renewed", {
        description: `New due date: ${new Date(result.dueAt).toLocaleDateString()}`,
      });
      qc.invalidateQueries({ queryKey: ["borrows"] });
      qc.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });
}

export function useJoinWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => library.joinWaitlist(bookId),
    onSuccess: (entry) => {
      toast.success("Joined waitlist", {
        description: `Your position is ${entry.position}.`,
      });
      qc.invalidateQueries({ queryKey: ["waitlist"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });
}

export function useLeaveWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => library.leaveWaitlist(bookId),
    onSuccess: () => {
      toast.success("Left waitlist");
      qc.invalidateQueries({ queryKey: ["waitlist"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });
}

export function useWaitlist(bookId: string) {
  const uid = useUid();
  return useQuery({
    queryKey: qk.waitlist(uid, bookId),
    queryFn: () => library.listWaitlist(bookId),
    enabled: !!uid && !!bookId,
  });
}

export function useReviews(bookId: string) {
  return useQuery({
    queryKey: qk.reviews(bookId),
    queryFn: () => library.listReviews(bookId),
  });
}

export function useSaveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, rating, body }: { bookId: string; rating: number; body: string }) =>
      library.saveReview(bookId, rating, body),
    onSuccess: (_id, value) => {
      toast.success("Review saved");
      qc.invalidateQueries({ queryKey: qk.reviews(value.bookId) });
    },
    onError: (error) => toast.error((error as Error).message),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => library.deleteReview(bookId),
    onSuccess: (_id, bookId) => {
      toast.success("Review deleted");
      qc.invalidateQueries({ queryKey: qk.reviews(bookId) });
    },
    onError: (error) => toast.error((error as Error).message),
  });
}

export function useRecommendations() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.recommendations(uid),
    queryFn: () => library.recommendBooks(12),
    enabled: !!uid,
  });
}

export function useReadingStats() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.readingStats(uid),
    queryFn: () => library.readingStats(),
    enabled: !!uid,
  });
}

export function useNotices() {
  return useQuery({
    queryKey: qk.notices,
    queryFn: () => library.listNotices(),
  });
}

export function useReadingLists() {
  const uid = useUid();
  return useQuery({
    queryKey: qk.readingLists(uid),
    queryFn: () => library.listReadingLists(),
    enabled: !!uid,
  });
}

export function useCreateReadingList() {
  const qc = useQueryClient();
  const uid = useUid();
  return useMutation({
    mutationFn: ({ name, publicSlug }: { name: string; publicSlug?: string }) =>
      library.createReadingList(name, publicSlug),
    onSuccess: () => {
      toast.success("Reading list created");
      qc.invalidateQueries({ queryKey: qk.readingLists(uid) });
    },
    onError: (error) => toast.error((error as Error).message),
  });
}

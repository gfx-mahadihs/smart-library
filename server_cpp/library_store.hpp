#ifndef LIBRARY_STORE_HPP
#define LIBRARY_STORE_HPP

#ifdef _WIN32
#include <windows.h>
#else
#include <mutex>
#endif
#include <vector>
#include <string>
#include <algorithm>
#include <chrono>
#include <ctime>
#include <fstream>
#include <cstdio>
#include <iterator>
#include <cstdio>
#include "json_helper.hpp"
#include "models.hpp"

class FastLock {
private:
#ifdef _WIN32
    CRITICAL_SECTION cs;
#else
    std::mutex cs;
#endif
public:
#ifdef _WIN32
    FastLock() { InitializeCriticalSection(&cs); }
    ~FastLock() { DeleteCriticalSection(&cs); }
    void lock() { EnterCriticalSection(&cs); }
    void unlock() { LeaveCriticalSection(&cs); }
#else
    FastLock() = default;
    ~FastLock() = default;
    void lock() { cs.lock(); }
    void unlock() { cs.unlock(); }
#endif
};

class Guard {
private:
    FastLock& lk;
public:
    Guard(FastLock& l) : lk(l) { lk.lock(); }
    ~Guard() { lk.unlock(); }
};

class LibraryStore {
private:
    FastLock mtx;
    std::vector<Category> categories;
    std::vector<Book> books;
    std::vector<Reservation> reservations;
    std::vector<BorrowRecord> borrows;
    std::vector<Fine> fines;
    std::vector<AppNotification> notifications;
    std::vector<std::string> favorites;
    std::vector<std::pair<std::string,int> > waitlist;
    std::vector<std::pair<std::string,std::string> > reviews;
    LibrarySettings settings;
    Profile userProfile;
    std::vector<std::string> userRoles;

    std::string getCurrentTimeIso() {
        auto now = std::chrono::system_clock::now();
        std::time_t t = std::chrono::system_clock::to_time_t(now);
        char buf[64];
        std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", std::gmtime(&t));
        return std::string(buf);
    }

    std::string getFutureTimeIso(int days) {
        auto now = std::chrono::system_clock::now();
        auto future = now + std::chrono::hours(24 * days);
        std::time_t t = std::chrono::system_clock::to_time_t(future);
        char buf[64];
        std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", std::gmtime(&t));
        return std::string(buf);
    }

public:
    LibraryStore() {
        initData();
        loadData();
    }

    void initData() {
        settings = { 14, 2, 1.50, 5, 48 };

        userProfile = {
            "usr_default_01",
            "Mahadi Hasan",
            "mahadi@example.com",
            "STU-2026-098",
            "Computer Science & Engineering",
            "Spring 2026",
            "",
            "en",
            true,
            true
        };

        userRoles = { "student", "librarian", "admin" };

        categories = {
            { "cat-prog", "Programming", "programming", "Craft, patterns and clean code", "blue", 1 },
            { "cat-cs", "Computer Science", "computer-science", "Algorithms and foundations", "gray", 2 },
            { "cat-math", "Mathematics", "mathematics", "Proof, puzzles and problem solving", "lime", 3 },
            { "cat-lit", "Literature", "literature", "Classics and modern fiction", "blue", 4 },
            { "cat-sci", "Science", "science", "The universe and everything in it", "gray", 5 },
            { "cat-biz", "Business", "business", "Habits, focus and strategy", "lime", 6 }
        };

        books = {
            {
                "bk-01", "Clean Code", "9780132350884", "Prentice Hall", "CSE", "en", 2008,
                "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
                "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg",
                4.8, 95, 464, true, "2026-01-10T10:00:00Z",
                "cat-prog", "Programming", "programming", "blue",
                {"Robert C. Martin"}, 5, 4
            },
            {
                "bk-02", "The Pragmatic Programmer", "9780135957059", "Addison-Wesley", "CSE", "en", 2019,
                "Straight from the programming trenches, illustrating the best practices and major pitfalls of modern software development.",
                "https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg",
                4.9, 98, 352, true, "2026-01-12T10:00:00Z",
                "cat-prog", "Programming", "programming", "blue",
                {"David Thomas", "Andrew Hunt"}, 4, 3
            },
            {
                "bk-03", "Refactoring", "9780134757599", "Addison-Wesley", "CSE", "en", 2018,
                "Improving the design of existing code through disciplined techniques to restructure a body of code.",
                "https://covers.openlibrary.org/b/isbn/9780134757599-L.jpg",
                4.7, 85, 448, false, "2026-01-15T10:00:00Z",
                "cat-prog", "Programming", "programming", "blue",
                {"Martin Fowler"}, 3, 2
            },
            {
                "bk-04", "Design Patterns", "9780201633610", "Addison-Wesley", "CSE", "en", 1994,
                "Elements of reusable object-oriented software captured by the Gang of Four.",
                "https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg",
                4.6, 90, 395, false, "2026-01-18T10:00:00Z",
                "cat-prog", "Programming", "programming", "blue",
                {"Erich Gamma", "Richard Helm", "Ralph Johnson", "John Vlissides"}, 6, 5
            },
            {
                "bk-05", "Introduction to Algorithms", "9780262046305", "MIT Press", "CSE", "en", 2022,
                "Comprehensive textbook covering the modern study of computer algorithms with depth and rigor.",
                "https://covers.openlibrary.org/b/isbn/9780262046305-L.jpg",
                4.9, 99, 1312, true, "2026-01-20T10:00:00Z",
                "cat-cs", "Computer Science", "computer-science", "gray",
                {"Thomas H. Cormen", "Charles E. Leiserson", "Ronald L. Rivest", "Clifford Stein"}, 8, 6
            },
            {
                "bk-06", "Structure and Interpretation of Computer Programs", "9780262510875", "MIT Press", "CSE", "en", 1996,
                "The legendary MIT computer science curriculum text on abstraction and computational systems.",
                "https://covers.openlibrary.org/b/isbn/9780262510875-L.jpg",
                4.9, 92, 657, false, "2026-01-22T10:00:00Z",
                "cat-cs", "Computer Science", "computer-science", "gray",
                {"Harold Abelson", "Gerald Jay Sussman"}, 3, 2
            },
            {
                "bk-07", "Code", "9780735611313", "Microsoft Press", "CSE", "en", 2000,
                "The hidden language of computer hardware and software told through charming analogies and clear diagrams.",
                "https://covers.openlibrary.org/b/isbn/9780735611313-L.jpg",
                4.8, 88, 400, false, "2026-01-25T10:00:00Z",
                "cat-cs", "Computer Science", "computer-science", "gray",
                {"Charles Petzold"}, 5, 4
            },
            {
                "bk-08", "How to Solve It", "9780691164076", "Princeton University Press", "Math", "en", 2014,
                "A perennial bestseller by George Polya providing a systematic method of problem solving.",
                "https://covers.openlibrary.org/b/isbn/9780691164076-L.jpg",
                4.6, 75, 288, false, "2026-02-01T10:00:00Z",
                "cat-math", "Mathematics", "mathematics", "lime",
                {"George Polya"}, 4, 3
            },
            {
                "bk-09", "Gödel, Escher, Bach", "9780465026562", "Basic Books", "Math", "en", 1999,
                "An eternal golden braid exploring human cognition, formal systems, self-reference, and art.",
                "https://covers.openlibrary.org/b/isbn/9780465026562-L.jpg",
                4.9, 94, 777, true, "2026-02-03T10:00:00Z",
                "cat-math", "Mathematics", "mathematics", "lime",
                {"Douglas Hofstadter"}, 3, 2
            },
            {
                "bk-10", "To Kill a Mockingbird", "9780061120084", "Harper Perennial", "Literature", "en", 2006,
                "A gripping, heart-wrenching, and wholly remarkable tale of coming-of-age in a South poisoned by virulent prejudice.",
                "https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg",
                4.8, 93, 336, false, "2026-02-05T10:00:00Z",
                "cat-lit", "Literature", "literature", "blue",
                {"Harper Lee"}, 6, 5
            },
            {
                "bk-11", "The Great Gatsby", "9780743273565", "Scribner", "Literature", "en", 2004,
                "The quintessential novel of the Jazz Age, exploring themes of wealth, love, and the American dream.",
                "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
                4.5, 87, 180, false, "2026-02-08T10:00:00Z",
                "cat-lit", "Literature", "literature", "blue",
                {"F. Scott Fitzgerald"}, 5, 4
            },
            {
                "bk-12", "1984", "9780451524935", "Signet Classic", "Literature", "en", 1950,
                "The masterpiece of dystopian fiction depicting a totalitarian world of surveillance, doublethink, and rebellion.",
                "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg",
                4.9, 96, 328, true, "2026-02-10T10:00:00Z",
                "cat-lit", "Literature", "literature", "blue",
                {"George Orwell"}, 7, 5
            },
            {
                "bk-13", "A Brief History of Time", "9780553380163", "Bantam Books", "Science", "en", 1998,
                "From the Big Bang to black holes, Stephen Hawking's landmark classic exploring our universe.",
                "https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg",
                4.8, 95, 256, true, "2026-02-12T10:00:00Z",
                "cat-sci", "Science", "science", "gray",
                {"Stephen Hawking"}, 6, 4
            },
            {
                "bk-14", "Sapiens", "9780062316097", "Harper", "Science", "en", 2015,
                "A brief history of humankind tracing how our species conquered planet Earth.",
                "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
                4.9, 99, 464, true, "2026-02-14T10:00:00Z",
                "cat-sci", "Science", "science", "gray",
                {"Yuval Noah Harari"}, 8, 6
            },
            {
                "bk-15", "Deep Work", "9781455586691", "Grand Central Publishing", "Business", "en", 2016,
                "Rules for focused success in a distracted world, cultivating intense concentration on cognitively demanding tasks.",
                "https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg",
                4.7, 89, 304, false, "2026-02-16T10:00:00Z",
                "cat-biz", "Business", "business", "lime",
                {"Cal Newport"}, 5, 4
            },
            {
                "bk-16", "Zero to One", "9780804139298", "Crown Business", "Business", "en", 2014,
                "Notes on startups, or how to build the future by creating truly novel technology.",
                "https://covers.openlibrary.org/b/isbn/9780804139298-L.jpg",
                4.6, 91, 224, false, "2026-02-18T10:00:00Z",
                "cat-biz", "Business", "business", "lime",
                {"Peter Thiel", "Blake Masters"}, 6, 5
            },
            {
                "bk-17", "Thinking, Fast and Slow", "9780374533557", "Farrar, Straus and Giroux", "Business", "en", 2013,
                "Nobel laureate Daniel Kahneman's definitive tour of the mind and the two systems that drive our decisions.",
                "https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg",
                4.8, 93, 512, true, "2026-02-20T10:00:00Z",
                "cat-biz", "Business", "business", "lime",
                {"Daniel Kahneman"}, 5, 3
            },
            {
                "bk-18", "Atomic Habits", "9780735211292", "Avery", "Business", "en", 2018,
                "An easy and proven way to build good habits and break bad ones through tiny changes that deliver remarkable results.",
                "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
                4.9, 99, 320, true, "2026-02-22T10:00:00Z",
                "cat-biz", "Business", "business", "lime",
                {"James Clear"}, 9, 7
            }
        };

        borrows.push_back({
            "bor-01", "usr_default_01",
            getCurrentTimeIso(),
            getFutureTimeIso(7),
            "",
            "active",
            "BAR-00109",
            books[12]
        });

        reservations.push_back({
            "res-01", "usr_default_01",
            "approved",
            getCurrentTimeIso(),
            getFutureTimeIso(2),
            books[13]
        });

        notifications.push_back({
            "notif-01", "Welcome to Smart Library",
            "Your account is set up and ready to reserve library volumes.",
            "welcome", false, getCurrentTimeIso()
        });

        notifications.push_back({
            "notif-02", "Reservation Approved",
            "Your reservation for 'Sapiens' is confirmed and held at the circulation desk.",
            "reservation", false, getCurrentTimeIso()
        });
    }

    void saveData() {
        const std::string tempPath = "library_store.json.tmp";
        const std::string path = "library_store.json";
        std::ofstream out(tempPath.c_str(), std::ios::out | std::ios::trunc);
        if (!out) return;
        out << "{"
            << "\"favorites\":[";
        for (size_t i=0;i<favorites.size();++i) {
            if (i) out << ",";
            out << json::quote(favorites[i]);
        }
        out << "],\"waitlist\":[";
        for (size_t i=0;i<waitlist.size();++i) {
            if (i) out << ",";
            out << "{\"bookId\":"<<json::quote(waitlist[i].first)
                <<",\"position\":"<<waitlist[i].second<<"}";
        }
        out << "],\"profile\":"
            << userProfile.toJson()
            << "}";
        out.close();
        std::remove(path.c_str());
        std::rename(tempPath.c_str(), path.c_str());
    }

    void loadData() {
        std::ifstream in("library_store.json");
        if (!in) return;
        std::string data((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
        std::string language = json::getStringField(data, "language");
        if (language == "en" || language == "bn") userProfile.language = language;
        std::string fullName = json::getStringField(data, "fullName");
        if (!fullName.empty()) userProfile.fullName = fullName;
    }

    std::vector<Category> getCategories() {
        Guard lock(mtx);
        return categories;
    }

    std::vector<Book> getBooks(const std::string& catSlug = "", const std::string& query = "") {
        Guard lock(mtx);
        std::vector<Book> result;
        std::string qLower = query;
        std::transform(qLower.begin(), qLower.end(), qLower.begin(), ::tolower);

        for (const auto& b : books) {
            bool matchCat = catSlug.empty() || (b.categorySlug == catSlug);
            bool matchQuery = qLower.empty();
            if (!matchQuery) {
                std::string titleLower = b.title;
                std::transform(titleLower.begin(), titleLower.end(), titleLower.begin(), ::tolower);
                if (titleLower.find(qLower) != std::string::npos) matchQuery = true;
                for (const auto& author : b.authors) {
                    std::string aLower = author;
                    std::transform(aLower.begin(), aLower.end(), aLower.begin(), ::tolower);
                    if (aLower.find(qLower) != std::string::npos) matchQuery = true;
                }
            }
            if (matchCat && matchQuery) {
                result.push_back(b);
            }
        }
        return result;
    }

    Book* findBookById(const std::string& id) {
        for (auto& b : books) {
            if (b.id == id) return &b;
        }
        return nullptr;
    }

    std::string getBookJson(const std::string& id) {
        Guard lock(mtx);
        Book* b = findBookById(id);
        if (b) return b->toJson();
        return "null";
    }

    std::vector<std::string> getAuthors() {
        Guard lock(mtx);
        std::vector<std::string> auths;
        for (const auto& b : books) {
            for (const auto& a : b.authors) {
                if (std::find(auths.begin(), auths.end(), a) == auths.end()) {
                    auths.push_back(a);
                }
            }
        }
        std::sort(auths.begin(), auths.end());
        return auths;
    }

    LibrarySettings getSettings() {
        Guard lock(mtx);
        return settings;
    }

    Profile getProfile() {
        Guard lock(mtx);
        return userProfile;
    }

    void updateProfile(const std::string& name, const std::string& dept, const std::string& sem) {
        Guard lock(mtx);
        if (!name.empty()) userProfile.fullName = name;
        if (!dept.empty()) userProfile.department = dept;
        if (!sem.empty()) userProfile.semester = sem;
        saveData();
    }

    std::vector<std::string> getRoles() {
        Guard lock(mtx);
        return userRoles;
    }

    std::vector<Reservation> getReservations() {
        Guard lock(mtx);
        return reservations;
    }

    std::string reserveBook(const std::string& bookId) {
        Guard lock(mtx);
        Book* b = findBookById(bookId);
        if (!b) return "";
        if (b->availableCopies > 0) {
            b->availableCopies--;
        }
        std::string newId = "res-" + std::to_string(reservations.size() + 1);
        reservations.push_back({
            newId, userProfile.id,
            "approved",
            getCurrentTimeIso(),
            getFutureTimeIso(2),
            *b
        });
        saveData();
        return newId;
    }

    bool cancelReservation(const std::string& resId) {
        Guard lock(mtx);
        for (auto it = reservations.begin(); it != reservations.end(); ++it) {
            if (it->id == resId) {
                Book* b = findBookById(it->book.id);
                if (b) b->availableCopies++;
                it->status = "cancelled";
                saveData();
                return true;
            }
        }
        return false;
    }

    std::vector<BorrowRecord> getBorrows() {
        Guard lock(mtx);
        return borrows;
    }

    std::vector<Fine> getFines() {
        Guard lock(mtx);
        return fines;
    }

    std::vector<AppNotification> getNotifications() {
        Guard lock(mtx);
        return notifications;
    }

    void markNotificationsRead() {
        Guard lock(mtx);
        for (auto& n : notifications) {
            n.read = true;
        }
    }

    std::vector<std::string> getFavorites() {
        Guard lock(mtx);
        return favorites;
    }

    void addFavorite(const std::string& bookId) {
        Guard lock(mtx);
        if (std::find(favorites.begin(), favorites.end(), bookId) == favorites.end()) {
            favorites.push_back(bookId);
            saveData();
        }
    }

    void removeFavorite(const std::string& bookId) {
        Guard lock(mtx);
        auto it = std::find(favorites.begin(), favorites.end(), bookId);
        if (it != favorites.end()) {
            favorites.erase(it);
            saveData();
        }
    }

    std::string renewBorrow(const std::string& borrowId) {
            Guard lock(mtx);
            for (auto& b : borrows) {
                if (b.id == borrowId && b.status == "active") {
                    b.dueAt = getFutureTimeIso(7);
                    saveData();
                    return "{\"dueAt\":"+json::quote(b.dueAt)+",\"renewalCount\":1}";
                }
            }
            return "{\"error\":\"Unable to renew loan\"}";
        }

        std::string joinWaitlist(const std::string& bookId) {
            Guard lock(mtx);
            int position=1;
            for (const auto& entry: waitlist) if (entry.first==bookId) position++;
            waitlist.push_back(std::make_pair(bookId,position));
            saveData();
            std::ostringstream ss;
            ss<<"{\"id\":\"\",\"position\":"<<position<<",\"status\":\"waiting\",\"holdExpiresAt\":null}";
            return ss.str();
        }

        void leaveWaitlist(const std::string& bookId) {
            Guard lock(mtx);
            for (auto it=waitlist.begin();it!=waitlist.end();) {
                if (it->first==bookId) it=waitlist.erase(it); else ++it;
            }
            saveData();
        }

        std::string listWaitlist(const std::string& bookId) {
            Guard lock(mtx);
            std::ostringstream ss;
            ss<<"[";
            bool first=true;
            for (const auto& entry: waitlist) if (entry.first==bookId) {
                if (!first) ss<<",";
                ss<<"{\"id\":\"\",\"position\":"<<entry.second<<",\"status\":\"waiting\",\"holdExpiresAt\":null}";
                first=false;
            }
            ss<<"]";
            return ss.str();
        }

        std::string saveReview(const std::string& bookId, int rating, const std::string& body) {
            Guard lock(mtx);
            if (rating<1 || rating>5) return "{\"error\":\"Rating must be between 1 and 5\"}";
            reviews.push_back(std::make_pair(bookId, body));
            saveData();
            return "{\"id\":\"review-"+std::to_string(reviews.size())+"\"}";
        }

        std::string listReviews(const std::string& bookId) {
            Guard lock(mtx);
            std::ostringstream ss;
            ss<<"[";
            bool first=true;
            for (size_t i=0;i<reviews.size();++i) if (reviews[i].first==bookId) {
                if (!first) ss<<",";
                ss<<"{\"id\":\"review-"<<i<<"\",\"bookId\":"<<json::quote(bookId)
                  <<",\"userId\":\"usr_default_01\",\"rating\":5,\"body\":"<<json::quote(reviews[i].second)
                  <<",\"hidden\":false,\"createdAt\":"<<json::quote(getCurrentTimeIso())
                  <<",\"updatedAt\":"<<json::quote(getCurrentTimeIso())<<"}";
                first=false;
            }
            ss<<"]";
            return ss.str();
        }

    std::string getAdminMetricsJson() {
        Guard lock(mtx);
        int totalCopies = 0;
        int availableCopies = 0;
        for (const auto& b : books) {
            totalCopies += b.totalCopies;
            availableCopies += b.availableCopies;
        }

        std::ostringstream ss;
        ss << "{"
           << "\"totalTitles\":" << books.size() << ","
           << "\"totalCopies\":" << totalCopies << ","
           << "\"availableCopies\":" << availableCopies << ","
           << "\"activeBorrows\":" << borrows.size() << ","
           << "\"activeReservations\":" << reservations.size() << ","
           << "\"totalUsers\":" << 142 << ","
           << "\"unpaidFines\":" << fines.size()
           << "}";
        return ss.str();
    }
};

#endif // LIBRARY_STORE_HPP

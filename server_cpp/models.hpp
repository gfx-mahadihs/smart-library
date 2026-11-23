#ifndef MODELS_HPP
#define MODELS_HPP

#include <string>
#include <vector>
#include <sstream>
#include "json_helper.hpp"

struct Category {
    std::string id;
    std::string name;
    std::string slug;
    std::string description;
    std::string tone; // "blue", "lime", "gray"
    int sort_order;

    std::string toJson() const {
        std::ostringstream ss;
        ss << "{"
           << "\"id\":" << json::quote(id) << ","
           << "\"name\":" << json::quote(name) << ","
           << "\"slug\":" << json::quote(slug) << ","
           << "\"description\":" << json::quote(description) << ","
           << "\"tone\":" << json::quote(tone) << ","
           << "\"sort_order\":" << sort_order
           << "}";
        return ss.str();
    }
};

struct Book {
    std::string id;
    std::string title;
    std::string isbn;
    std::string publisher;
    std::string department;
    std::string language;
    int publicationYear;
    std::string description;
    std::string coverUrl;
    double rating;
    int popularity;
    int pages;
    bool featured;
    std::string createdAt;
    std::string categoryId;
    std::string categoryName;
    std::string categorySlug;
    std::string categoryTone;
    std::vector<std::string> authors;
    int totalCopies;
    int availableCopies;

    std::string toJson() const {
        std::ostringstream ss;
        ss << "{"
           << "\"id\":" << json::quote(id) << ","
           << "\"title\":" << json::quote(title) << ","
           << "\"isbn\":" << json::quote(isbn) << ","
           << "\"publisher\":" << json::quote(publisher) << ","
           << "\"department\":" << json::quote(department) << ","
           << "\"language\":" << json::quote(language) << ","
           << "\"publicationYear\":" << publicationYear << ","
           << "\"description\":" << json::quote(description) << ","
           << "\"coverUrl\":" << json::quote(coverUrl) << ","
           << "\"rating\":" << rating << ","
           << "\"popularity\":" << popularity << ","
           << "\"pages\":" << pages << ","
           << "\"featured\":" << (featured ? "true" : "false") << ","
           << "\"createdAt\":" << json::quote(createdAt) << ","
           << "\"category\":{"
           << "\"id\":" << json::quote(categoryId) << ","
           << "\"name\":" << json::quote(categoryName) << ","
           << "\"slug\":" << json::quote(categorySlug) << ","
           << "\"tone\":" << json::quote(categoryTone)
           << "},"
           << "\"authors\":[";
        for (size_t i = 0; i < authors.size(); ++i) {
            ss << json::quote(authors[i]);
            if (i + 1 < authors.size()) ss << ",";
        }
        ss << "],"
           << "\"totalCopies\":" << totalCopies << ","
           << "\"availableCopies\":" << availableCopies
           << "}";
        return ss.str();
    }
};

struct Profile {
    std::string id;
    std::string fullName;
    std::string email;
    std::string universityId;
    std::string department;
    std::string semester;
    std::string avatarUrl;
    std::string language;
    bool notifyEmail;
    bool notifyDueDates;

    std::string toJson() const {
        std::ostringstream ss;
        ss << "{"
           << "\"id\":" << json::quote(id) << ","
           << "\"fullName\":" << json::quote(fullName) << ","
           << "\"email\":" << json::quote(email) << ","
           << "\"universityId\":" << json::quote(universityId) << ","
           << "\"department\":" << json::quote(department) << ","
           << "\"semester\":" << json::quote(semester) << ","
           << "\"avatarUrl\":" << json::quote(avatarUrl) << ","
           << "\"language\":" << json::quote(language) << ","
           << "\"notifyEmail\":" << (notifyEmail ? "true" : "false") << ","
           << "\"notifyDueDates\":" << (notifyDueDates ? "true" : "false")
           << "}";
        return ss.str();
    }
};

struct Reservation {
    std::string id;
    std::string userId;
    std::string status; // "pending", "approved", "ready_for_pickup", "cancelled", "completed"
    std::string reservedAt;
    std::string expiresAt;
    Book book;

    std::string toJson() const {
        std::ostringstream ss;
        ss << "{"
           << "\"id\":" << json::quote(id) << ","
           << "\"status\":" << json::quote(status) << ","
           << "\"reservedAt\":" << json::quote(reservedAt) << ","
           << "\"expiresAt\":" << json::quote(expiresAt) << ","
           << "\"book\":" << book.toJson()
           << "}";
        return ss.str();
    }
};

struct BorrowRecord {
    std::string id;
    std::string userId;
    std::string borrowedAt;
    std::string dueAt;
    std::string returnedAt;
    std::string status; // "active", "returned", "lost"
    std::string barcode;
    Book book;

    std::string toJson() const {
        std::ostringstream ss;
        ss << "{"
           << "\"id\":" << json::quote(id) << ","
           << "\"borrowedAt\":" << json::quote(borrowedAt) << ","
           << "\"dueAt\":" << json::quote(dueAt) << ","
           << "\"returnedAt\":" << (returnedAt.empty() ? "null" : json::quote(returnedAt)) << ","
           << "\"status\":" << json::quote(status) << ","
           << "\"barcode\":" << json::quote(barcode) << ","
           << "\"book\":" << book.toJson()
           << "}";
        return ss.str();
    }
};

struct Fine {
    std::string id;
    std::string userId;
    double amount;
    std::string status; // "unpaid", "paid", "waived"
    std::string reason;
    std::string createdAt;

    std::string toJson() const {
        std::ostringstream ss;
        ss << "{"
           << "\"id\":" << json::quote(id) << ","
           << "\"amount\":" << amount << ","
           << "\"status\":" << json::quote(status) << ","
           << "\"reason\":" << json::quote(reason) << ","
           << "\"createdAt\":" << json::quote(createdAt)
           << "}";
        return ss.str();
    }
};

struct AppNotification {
    std::string id;
    std::string title;
    std::string message;
    std::string type;
    bool read;
    std::string createdAt;

    std::string toJson() const {
        std::ostringstream ss;
        ss << "{"
           << "\"id\":" << json::quote(id) << ","
           << "\"title\":" << json::quote(title) << ","
           << "\"message\":" << json::quote(message) << ","
           << "\"type\":" << json::quote(type) << ","
           << "\"read\":" << (read ? "true" : "false") << ","
           << "\"createdAt\":" << json::quote(createdAt)
           << "}";
        return ss.str();
    }
};

struct LibrarySettings {
    int loanPeriodDays;
    int gracePeriodDays;
    double finePerDay;
    int maxActiveBorrows;
    int reservationHoldHours;

    std::string toJson() const {
        std::ostringstream ss;
        ss << "{"
           << "\"loanPeriodDays\":" << loanPeriodDays << ","
           << "\"gracePeriodDays\":" << gracePeriodDays << ","
           << "\"finePerDay\":" << finePerDay << ","
           << "\"maxActiveBorrows\":" << maxActiveBorrows << ","
           << "\"reservationHoldHours\":" << reservationHoldHours
           << "}";
        return ss.str();
    }
};

#endif // MODELS_HPP

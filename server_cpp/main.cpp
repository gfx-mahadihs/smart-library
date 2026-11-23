#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <arpa/inet.h>
#endif
#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <map>
#include <cstdlib>
#include "library_store.hpp"
#include "json_helper.hpp"


struct HttpRequest {
    std::string method;
    std::string path;
    std::string query;
    std::map<std::string, std::string> queryParams;
    std::map<std::string, std::string> headers;
    std::string body;
};

void parseQueryParams(const std::string& query, std::map<std::string, std::string>& params) {
    std::istringstream ss(query);
    std::string pair;
    while (std::getline(ss, pair, '&')) {
        size_t eq = pair.find('=');
        if (eq != std::string::npos) {
            params[pair.substr(0, eq)] = pair.substr(eq + 1);
        } else if (!pair.empty()) {
            params[pair] = "";
        }
    }
}

HttpRequest parseRequest(const std::string& raw) {
    HttpRequest req;
    std::istringstream stream(raw);
    std::string line;

    if (std::getline(stream, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        std::istringstream lineStream(line);
        std::string fullPath;
        lineStream >> req.method >> fullPath;

        size_t qMark = fullPath.find('?');
        if (qMark != std::string::npos) {
            req.path = fullPath.substr(0, qMark);
            req.query = fullPath.substr(qMark + 1);
            parseQueryParams(req.query, req.queryParams);
        } else {
            req.path = fullPath;
        }
    }

    while (std::getline(stream, line) && line != "\r" && !line.empty()) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        size_t colon = line.find(':');
        if (colon != std::string::npos) {
            std::string k = line.substr(0, colon);
            std::string v = line.substr(colon + 1);
            while (!v.empty() && (v.front() == ' ' || v.front() == '\t')) v.erase(v.begin());
            req.headers[k] = v;
        }
    }

    std::ostringstream bodyStream;
    while (std::getline(stream, line)) {
        bodyStream << line << "\n";
    }
    req.body = bodyStream.str();
    return req;
}

std::string makeResponse(int statusCode, const std::string& statusText, const std::string& jsonBody) {
    std::ostringstream ss;
    ss << "HTTP/1.1 " << statusCode << " " << statusText << "\r\n";
    ss << "Content-Type: application/json; charset=utf-8\r\n";
    ss << "Access-Control-Allow-Origin: *\r\n";
    ss << "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n";
    ss << "Access-Control-Allow-Headers: Content-Type, Authorization\r\n";
    ss << "Content-Length: " << jsonBody.size() << "\r\n";
    ss << "Connection: close\r\n\r\n";
    ss << jsonBody;
    return ss.str();
}

std::string handleRequest(LibraryStore& store, const HttpRequest& req) {
    if (req.method == "OPTIONS") {
        return makeResponse(204, "No Content", "");
    }
    const char* tokenEnv = std::getenv("CPP_API_TOKEN");
    if (tokenEnv && *tokenEnv) {
        auto auth = req.headers.find("Authorization");
        if (auth == req.headers.end() || auth->second != std::string("Bearer ") + tokenEnv) {
            return makeResponse(401, "Unauthorized", "{\"error\":\"Unauthorized\"}");
        }
    }

    // Health check
    if (req.path == "/api/health") {
        return makeResponse(200, "OK", "{\"status\":\"ok\",\"service\":\"smart-library-cpp-backend\",\"version\":\"1.0.0\"}");
    }

    // Public Catalogue (returns both books and categories)
    if (req.path == "/api/catalogue") {
        auto cats = store.getCategories();
        auto bks = store.getBooks();

        std::ostringstream ss;
        ss << "{\"categories\":[";
        for (size_t i = 0; i < cats.size(); ++i) {
            ss << cats[i].toJson();
            if (i + 1 < cats.size()) ss << ",";
        }
        ss << "],\"books\":[";
        for (size_t i = 0; i < bks.size(); ++i) {
            ss << bks[i].toJson();
            if (i + 1 < bks.size()) ss << ",";
        }
        ss << "]}";
        return makeResponse(200, "OK", ss.str());
    }

    // Categories
    if (req.path == "/api/categories") {
        auto cats = store.getCategories();
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < cats.size(); ++i) {
            ss << cats[i].toJson();
            if (i + 1 < cats.size()) ss << ",";
        }
        ss << "]";
        return makeResponse(200, "OK", ss.str());
    }

    // Books list
    if (req.path == "/api/books") {
        std::string cat = "";
        std::string q = "";
        auto itC = req.queryParams.find("category");
        if (itC != req.queryParams.end()) cat = itC->second;
        auto itQ = req.queryParams.find("q");
        if (itQ != req.queryParams.end()) q = itQ->second;

        auto bks = store.getBooks(cat, q);
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < bks.size(); ++i) {
            ss << bks[i].toJson();
            if (i + 1 < bks.size()) ss << ",";
        }
        ss << "]";
        return makeResponse(200, "OK", ss.str());
    }

    // Single Book: /api/books/{id}
    if (req.path.rfind("/api/books/", 0) == 0) {
        std::string id = req.path.substr(11);
        std::string bookJson = store.getBookJson(id);
        if (bookJson == "null") {
            return makeResponse(404, "Not Found", "{\"error\":\"Book not found\"}");
        }
        return makeResponse(200, "OK", bookJson);
    }

    // Authors list
    if (req.path == "/api/authors") {
        auto auths = store.getAuthors();
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < auths.size(); ++i) {
            ss << json::quote(auths[i]);
            if (i + 1 < auths.size()) ss << ",";
        }
        ss << "]";
        return makeResponse(200, "OK", ss.str());
    }

    // Settings
    if (req.path == "/api/settings") {
        return makeResponse(200, "OK", store.getSettings().toJson());
    }

    // Profile
    if (req.path == "/api/profile") {
        if (req.method == "GET") {
            return makeResponse(200, "OK", store.getProfile().toJson());
        }
        if (req.method == "PUT" || req.method == "POST") {
            std::string name = json::getStringField(req.body, "fullName");
            std::string dept = json::getStringField(req.body, "department");
            std::string sem = json::getStringField(req.body, "semester");
            store.updateProfile(name, dept, sem);
            return makeResponse(200, "OK", store.getProfile().toJson());
        }
    }

    // Roles
    if (req.path == "/api/roles") {
        auto roles = store.getRoles();
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < roles.size(); ++i) {
            ss << json::quote(roles[i]);
            if (i + 1 < roles.size()) ss << ",";
        }
        ss << "]";
        return makeResponse(200, "OK", ss.str());
    }

    // Favorites
    if (req.path == "/api/favorites") {
        if (req.method == "GET") {
            auto favs = store.getFavorites();
            std::ostringstream ss;
            ss << "[";
            for (size_t i = 0; i < favs.size(); ++i) {
                ss << json::quote(favs[i]);
                if (i + 1 < favs.size()) ss << ",";
            }
            ss << "]";
            return makeResponse(200, "OK", ss.str());
        }
        if (req.method == "POST") {
            std::string bookId = json::getStringField(req.body, "bookId");
            if (!bookId.empty()) store.addFavorite(bookId);
            return makeResponse(200, "OK", "{\"status\":\"added\"}");
        }
        if (req.method == "DELETE") {
            std::string bookId = json::getStringField(req.body, "bookId");
            if (!bookId.empty()) store.removeFavorite(bookId);
            return makeResponse(200, "OK", "{\"status\":\"removed\"}");
        }
    }

    // Reservations
    if (req.path == "/api/reservations") {
        if (req.method == "GET") {
            auto res = store.getReservations();
            std::ostringstream ss;
            ss << "[";
            for (size_t i = 0; i < res.size(); ++i) {
                ss << res[i].toJson();
                if (i + 1 < res.size()) ss << ",";
            }
            ss << "]";
            return makeResponse(200, "OK", ss.str());
        }
        if (req.method == "POST") {
            std::string bookId = json::getStringField(req.body, "bookId");
            std::string id = store.reserveBook(bookId);
            if (id.empty()) {
                return makeResponse(400, "Bad Request", "{\"error\":\"Unable to reserve book\"}");
            }
            return makeResponse(200, "OK", "{\"id\":" + json::quote(id) + "}");
        }
    }

    if (req.path.rfind("/api/reservations/", 0) == 0 && req.method == "DELETE") {
        std::string resId = req.path.substr(18);
        store.cancelReservation(resId);
        return makeResponse(200, "OK", "{\"status\":\"cancelled\"}");
    }

    // Borrows
    if (req.path == "/api/borrows") {
        auto bors = store.getBorrows();
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < bors.size(); ++i) {
            ss << bors[i].toJson();
            if (i + 1 < bors.size()) ss << ",";
        }
        ss << "]";
        return makeResponse(200, "OK", ss.str());
    }

    // Fines
    if (req.path == "/api/fines") {
        auto f = store.getFines();
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < f.size(); ++i) {
            ss << f[i].toJson();
            if (i + 1 < f.size()) ss << ",";
        }
        ss << "]";
        return makeResponse(200, "OK", ss.str());
    }

    // Notifications
    if (req.path == "/api/notifications") {
        auto notifs = store.getNotifications();
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < notifs.size(); ++i) {
            ss << notifs[i].toJson();
            if (i + 1 < notifs.size()) ss << ",";
        }
        ss << "]";
        return makeResponse(200, "OK", ss.str());
    }

    if (req.path == "/api/notifications/read" && req.method == "POST") {
        store.markNotificationsRead();
        return makeResponse(200, "OK", "{\"status\":\"read\"}");
    }

    // Admin Metrics
    if (req.path == "/api/admin/metrics") {
        return makeResponse(200, "OK", store.getAdminMetricsJson());
    }

    if (req.path.rfind("/api/borrows/",0)==0 && req.path.rfind("/renew",4)!=std::string::npos && req.method=="POST") {
        std::string id=req.path.substr(13,req.path.size()-19);
        return makeResponse(200,"OK",store.renewBorrow(id));
    }
    if (req.path=="/api/waitlist" && req.method=="POST") {
        std::string bookId=json::getStringField(req.body,"bookId");
        return makeResponse(200,"OK",store.joinWaitlist(bookId));
    }
    if (req.path.rfind("/api/waitlist/",0)==0) {
        std::string bookId=req.path.substr(14);
        if (req.method=="DELETE") { store.leaveWaitlist(bookId); return makeResponse(200,"OK","{\"status\":\"left\"}"); }
        if (req.method=="GET") return makeResponse(200,"OK",store.listWaitlist(bookId));
    }
    if (req.path=="/api/reviews" && req.method=="POST") {
        std::string bookId=json::getStringField(req.body,"bookId");
        int rating=static_cast<int>(json::getNumberField(req.body,"rating",0));
        std::string body=json::getStringField(req.body,"body");
        std::string result=store.saveReview(bookId,rating,body);
        if (result.find("error")!=std::string::npos) return makeResponse(400,"Bad Request",result);
        return makeResponse(200,"OK",result);
    }
    if (req.path.rfind("/api/reviews/",0)==0 && req.method=="GET") {
        std::string bookId=req.path.substr(13);
        return makeResponse(200,"OK",store.listReviews(bookId));
    }
    if (req.path=="/api/admin/reports") {
        return makeResponse(200,"OK","{\"mostBorrowed\":[],\"byDepartment\":[],\"overdue\":[],\"finesCollected\":0}");
    }

    return makeResponse(404, "Not Found", "{\"error\":\"Endpoint not found\"}");
}

int main(int argc, char* argv[]) {
    int port = argc > 1 ? std::stoi(argv[1]) : 5000;

#ifdef _WIN32
    typedef SOCKET Socket;
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) return 1;
#else
    typedef int Socket;
#endif

    Socket listenSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
#ifdef _WIN32
    if (listenSocket == INVALID_SOCKET) { WSACleanup(); return 1; }
#else
    if (listenSocket < 0) return 1;
#endif

    int opt = 1;
    setsockopt(listenSocket, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));

    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(port);

#ifdef _WIN32
    if (bind(listenSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        closesocket(listenSocket); WSACleanup(); return 1;
    }
    if (listen(listenSocket, SOMAXCONN) == SOCKET_ERROR) {
        closesocket(listenSocket); WSACleanup(); return 1;
    }
#else
    if (bind(listenSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        close(listenSocket); return 1;
    }
    if (listen(listenSocket, SOMAXCONN) < 0) { close(listenSocket); return 1; }
#endif

    std::cout << "[C++ Backend] listening on http://localhost:" << port << "\n" << std::flush;
    LibraryStore store;

    while (true) {
        sockaddr_in clientAddr;
#ifdef _WIN32
        int clientLen = sizeof(clientAddr);
#else
        socklen_t clientLen = sizeof(clientAddr);
#endif
        Socket clientSocket = accept(listenSocket, (sockaddr*)&clientAddr, &clientLen);
#ifdef _WIN32
        if (clientSocket == INVALID_SOCKET) continue;
#else
        if (clientSocket < 0) continue;
#endif

        char buffer[4096];
        int bytesReceived = recv(clientSocket, buffer, sizeof(buffer)-1, 0);
        if (bytesReceived > 0) {
            buffer[bytesReceived]='\0';
            HttpRequest req=parseRequest(buffer);
            std::string response=handleRequest(store,req);
            send(clientSocket,response.c_str(),static_cast<int>(response.size()),0);
        }
#ifdef _WIN32
        closesocket(clientSocket);
#else
        close(clientSocket);
#endif
    }
}

# Smart Library C++ Backend Engine

A high-performance, multithreaded native HTTP REST server built in C++14 using the Windows Winsock2 API.

## Features

- **Zero-Dependency Native Server**: Built using Winsock2 sockets and optimized JSON serialization.
- **Thread-Safe In-Memory Store**: Synchronized with high-performance Win32 critical sections.
- **CORS Enabled**: Out-of-the-box support for browser fetch requests across all origins, headers, and HTTP methods.
- **Domain Conformance**: Pre-seeded with 18 classic library volumes, 6 categories, circulation desks, and live borrowing states.

## API Endpoints

| Method            | Endpoint                | Description                                   |
| :---------------- | :---------------------- | :-------------------------------------------- |
| `GET`             | `/api/health`           | Health & service metadata                     |
| `GET`             | `/api/catalogue`        | Full books and categories bundle              |
| `GET`             | `/api/categories`       | List all library categories                   |
| `GET`             | `/api/books`            | Filterable books list (`?category=...&q=...`) |
| `GET`             | `/api/books/:id`        | Single volume lookup                          |
| `GET`             | `/api/authors`          | Unique list of all authors                    |
| `GET`             | `/api/settings`         | Circulation and loan policies                 |
| `GET/PUT`         | `/api/profile`          | Current patron profile                        |
| `GET`             | `/api/roles`            | Role permissions                              |
| `GET/POST/DELETE` | `/api/favorites`        | Patron favorite titles                        |
| `GET/POST`        | `/api/reservations`     | Active reservations & placement               |
| `DELETE`          | `/api/reservations/:id` | Cancel reservation                            |
| `GET`             | `/api/borrows`          | Active borrowed records & due dates           |
| `GET`             | `/api/fines`            | Patron fine records                           |
| `GET/POST`        | `/api/notifications`    | Notifications & read receipts                 |
| `GET`             | `/api/admin/metrics`    | Real-time administrative metrics              |

## Build & Run

### Using npm

```bash
# Compile C++ backend
npm run build:cpp

# Start C++ backend (Port 5000)
npm run start:cpp
```

### Manual Compile

```bash
cd server_cpp
g++ -std=c++14 -O2 main.cpp -o library_server.exe -lws2_32
.\library_server.exe
```

## Frontend Integration

The frontend binds seamlessly via `src/services/cpp-library-service.ts`.
Set `VITE_BACKEND_TYPE="cpp"` in `.env` or swap the binding in `src/services/index.ts`.

## Cross-platform build

### Windows
```powershell
cmake -S server_cpp -B server_cpp/build
cmake --build server_cpp/build --config Release
set CPP_API_TOKEN=replace-with-local-token
server_cpp\build\Release\granthagar_server.exe 5000
```

### Linux
```bash
cmake -S server_cpp -B server_cpp/build
cmake --build server_cpp/build
CPP_API_TOKEN=replace-with-local-token server_cpp/build/granthagar_server 5000
```

The server persists state to `library_store.json` in its working directory. Send `Authorization: Bearer <CPP_API_TOKEN>` when `CPP_API_TOKEN` is configured.

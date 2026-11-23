@echo off
echo Building Smart Library C++ Backend...
g++ -std=c++14 -O2 main.cpp -o library_server.exe -lws2_32
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] library_server.exe built successfully.
) else (
    echo [ERROR] Compilation failed.
)

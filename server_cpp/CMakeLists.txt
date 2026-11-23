cmake_minimum_required(VERSION 3.16)
project(granthagar_cpp_backend LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(granthagar_server main.cpp)

if(WIN32)
  target_link_libraries(granthagar_server PRIVATE ws2_32)
endif()

#ifndef JSON_HELPER_HPP
#define JSON_HELPER_HPP

#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <iomanip>

namespace json {

inline std::string escape(const std::string& s) {
    std::ostringstream o;
    for (char c : s) {
        switch (c) {
            case '"': o << "\\\""; break;
            case '\\': o << "\\\\"; break;
            case '\b': o << "\\b"; break;
            case '\f': o << "\\f"; break;
            case '\n': o << "\\n"; break;
            case '\r': o << "\\r"; break;
            case '\t': o << "\\t"; break;
            default:
                if (static_cast<unsigned char>(c) <= 0x1f) {
                    o << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c);
                } else {
                    o << c;
                }
        }
    }
    return o.str();
}

inline std::string quote(const std::string& s) {
    return "\"" + escape(s) + "\"";
}

// Simple key-value string extractor for flat JSON bodies
inline std::string getStringField(const std::string& json, const std::string& key) {
    std::string needle = "\"" + key + "\"";
    size_t pos = json.find(needle);
    if (pos == std::string::npos) return "";
    pos = json.find(':', pos);
    if (pos == std::string::npos) return "";
    pos = json.find_first_not_of(" \t\n\r", pos + 1);
    if (pos == std::string::npos) return "";
    if (json[pos] == '"') {
        size_t end = json.find('"', pos + 1);
        if (end != std::string::npos) {
            return json.substr(pos + 1, end - pos - 1);
        }
    }
    return "";
}

inline double getNumberField(const std::string& json, const std::string& key, double defaultVal = 0.0) {
    std::string needle = "\"" + key + "\"";
    size_t pos = json.find(needle);
    if (pos == std::string::npos) return defaultVal;
    pos = json.find(':', pos);
    if (pos == std::string::npos) return defaultVal;
    pos = json.find_first_not_of(" \t\n\r", pos + 1);
    if (pos == std::string::npos) return defaultVal;
    size_t end = json.find_first_of(",}\n\r", pos);
    if (end != std::string::npos) {
        std::string numStr = json.substr(pos, end - pos);
        try {
            return std::stod(numStr);
        } catch (...) {}
    }
    return defaultVal;
}

} // namespace json

#endif // JSON_HELPER_HPP

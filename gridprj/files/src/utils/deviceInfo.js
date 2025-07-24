export function getDeviceInfo() {
const userAgent = navigator.userAgent.toLowerCase();
const platform = navigator.platform.toLowerCase();
let os = "Unknown";
let deviceType = "Unknown";
let lineBreak = "\n"; // Default to Unix-style
// Operating System Detection
if (/windows/.test(platform) || /win/.test(userAgent)) {
os = "Windows";
lineBreak = "\r\n"; // For Windows
deviceType = "Masaüstü";
} else if (/mac/.test(platform) || /mac/.test(userAgent)) {
os = "macOS";
lineBreak = "\n"; // For macOS
deviceType = "Masaüstü veya Laptop";
} else if (/android/.test(userAgent)) {
os = "Android";
lineBreak = "\n"; // For Android
deviceType = /mobile/.test(userAgent) ? "Telefon" : "Tablet";
} else if (/iphone|ipad|ipod/.test(userAgent)) {
os = "iOS";
lineBreak = "\n"; // For iOS
deviceType = /ipad/.test(userAgent) ? "Tablet" : "Telefon";
} else if (/linux/.test(platform)) {
os = "Linux";
lineBreak = "\n"; // For Linux
deviceType = "Masaüstü veya Laptop";
} else if (/windows phone/.test(userAgent)) {
os = "Windows Phone";
lineBreak = "\r\n"; // For Windows Phone
deviceType = "Telefon";
}
return {
os,
deviceType,
lineBreak,
};
}

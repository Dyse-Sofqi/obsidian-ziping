// 日期时间工具函数
// 从BaziView.ts和TimeSettingModal.ts中提取的日期相关函数

/**
 * 格式化日期时间为字符串：YYYY-MM-DD HH:MM:SS
 */
export function formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 格式化日期时间为简短字符串：MM/DD HH:MM
 * 用于节气显示
 */
export function formatShortDateTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`;
}

/**
 * 格式化日期为中文格式：YYYY年MM月DD日
 */
export function formatChineseDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
}

/**
 * 格式化时间为中文格式：HH:MM:SS
 */
export function formatChineseTime(date: Date): string {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${hour}:${minute}:${second}`;
}

/**
 * 获取当前时间并格式化为排盘码格式：YYYY.MM.DD-HH.MM-G
 * 其中G为性别代码：Y表示男，X表示女
 */
export function formatToPaiPanCode(year: number, month: number, day: number, hour: number, minute: number, gender: number): string {
    const genderCode = gender === 0 ? 'Y' : 'X';
    return `${String(year)}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}-${String(hour).padStart(2, '0')}.${String(minute).padStart(2, '0')}-${genderCode}`;
}

/**
 * 解析排盘码为日期和性别信息
 * 格式：YYYY.MM.DD-HH.MM-G
 */
export function parsePaiPanCode(code: string): { 
    year: number; 
    month: number; 
    day: number; 
    hour: number; 
    minute: number; 
    gender: number; // 0: 男, 1: 女
} | null {
    const codeRegex = /^(\d{4})\.(\d{2})\.(\d{2})-(\d{2})\.(\d{2})-([XY])$/;
    const match = code.match(codeRegex);
    
    if (!match) return null;
    
    const year = parseInt(match[1]!);
    const month = parseInt(match[2]!);
    const day = parseInt(match[3]!);
    const hour = parseInt(match[4]!);
    const minute = parseInt(match[5]!);
    const genderCode = match[6]!;
    const gender = genderCode === 'Y' ? 0 : 1;
    
    return { year, month, day, hour, minute, gender };
}

/**
 * 计算时间调整后的新日期
 */
export function adjustDateTime(baseDate: Date, hourDelta: number): Date {
    const newDate = new Date(baseDate);
    newDate.setHours(newDate.getHours() + hourDelta);
    return newDate;
}

/**
 * 检查日期是否有效
 */
export function isValidDate(year: number, month: number, day: number): boolean {
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    // 简单的月份天数检查
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // 考虑闰年
    if (month === 2) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const febDays = isLeapYear ? 29 : 28;
        if (day > febDays) return false;
    } else if (day > daysInMonth[month - 1]!) {
        return false;
    }
    
    return true;
}

/**
 * 获取日期范围（用于下拉选择器）
 */
export function getYearRange(start: number = 1600, end: number = 2100): number[] {
    const years: number[] = [];
    for (let y = start; y <= end; y++) {
        years.push(y);
    }
    return years;
}

/**
 * 获取月份范围
 */
export function getMonthRange(): number[] {
    return Array.from({ length: 12 }, (_, i) => i + 1);
}

/**
 * 获取日期范围（根据年份和月份）
 */
export function getDayRange(year: number, month: number): number[] {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // 考虑闰年
    if (month === 2) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const febDays = isLeapYear ? 29 : 28;
        return Array.from({ length: febDays }, (_, i) => i + 1);
    }
    
    const days = daysInMonth[month - 1] || 31;
    return Array.from({ length: days }, (_, i) => i + 1);
}

/**
 * 获取小时范围（0-23）
 */
export function getHourRange(): number[] {
    return Array.from({ length: 24 }, (_, i) => i);
}

/**
 * 获取分钟范围（0-59）
 */
export function getMinuteRange(): number[] {
    return Array.from({ length: 60 }, (_, i) => i);
}

/**
 * 获取秒范围（0-59）
 */
export function getSecondRange(): number[] {
    return Array.from({ length: 60 }, (_, i) => i);
}

/**
 * 农历月份名称
 */
export const LUNAR_MONTH_NAMES = [
    '正月', '二月', '三月', '四月', '五月', '六月', 
    '七月', '八月', '九月', '十月', '冬月', '腊月'
];

/**
 * 农历日期名称
 */
export const LUNAR_DAY_NAMES = [
    '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

/**
 * 获取农历月份名称
 */
export function getLunarMonthName(month: number, isLeap: boolean = false): string {
    if (month < 1 || month > 12) return '';
    const name = LUNAR_MONTH_NAMES[month - 1] || '';
    return isLeap ? `闰${name}` : name;
}

/**
 * 获取农历日期名称
 */
export function getLunarDayName(day: number): string {
    if (day < 1 || day > 30) return '';
    return LUNAR_DAY_NAMES[day - 1] || '';
}
// 八字排盘相关类型定义
// 从 Paipan.ts 和 BaziView.ts 中提取的接口和类型

export interface CurrentBaziData {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    amOrPm: string;
    gender: number; // 0: 男, 1: 女
    name: string;
    bazi: BaziResult;
    solarTerms: NearbySolarTerms;
    dayun: CurrentDayunData;
    selectedDayunIndex?: number;
    selectedLiunianIndex?: number;
    selectedLiuyueIndex?: number;
    liuyue?: LiuyueItem[];
    timeCorrectionEnabled: boolean;
    tag: string;
    province?: string;
    city?: string;
    district?: string;
    longitude?: number;
    latitude?: number;
    showHourPillar?: boolean;
    showLiuyue?: boolean;
}

// Paipan.ts 中的类型定义
export interface BaziResult {
    gztg: string[]; // 年、月、日、时 天干
    dz: string[]; // 年、月、日、时 地支
    nyy: number[]; // 标记大运开始和结束年份
    nwx: number[]; // 五行属性配置
    zty?: { hour: number; minute: number; second: number }; // 真太阳时
}

export interface SolarTerm {
    name: string;
    date: Date;
}

export interface NearbySolarTerms {
    previous: SolarTerm | null;
    next: SolarTerm | null;
    interval: number | null;
}

export interface DayunItem {
    age: number;
    startYear: number;  // 换运年份
    gan: string;
    zhi: string;
    gz: string;
}

export interface DayunData {
    startAge: number;
    dayun: DayunItem[];
}

export interface CurrentDayunData {
    startAge: number;
    currentDayun: DayunItem;
    liunian: number;
    allDayun: DayunItem[];
    qyy_desc?: string;
    qyy_desc2?: string;
    renyuanSiling?: string;
    jiaoyunDateDesc?: string;  // 交运具体日期描述，如"立春后3日5时"
    jiaoyunDetailDesc?: string; // 原交运描述作为备用
    dayun?: DayunItem[]; // 兼容新老版本
}

// 地理位置相关类型
export interface CityItem {
    id: number;
    name: string;
    longitude: number;
    latitude: number;
    parentId?: number;
}

export interface ProvinceCityDistrictGroup {
    province: CityItem;
    cities: CityItem[];
    districts: Map<number, CityItem[]>;
}

// 四柱筛选结果类型
export interface FilterResult {
    year: number;
    month: number;
    day: number;
    hour: number;
}

// 流月相关类型
export interface LiuyueItem {
    name: string;     // "立春"、"雨水"等节气名称
    date: string;     // "2/4" 格式日期
    gan: string;      // 天干
    zhi: string;      // 地支
    gz: string;       // 完整干支
    ganShishen?: string;  // 天干十神
    zhiShishen?: string;  // 地支十神
    shishen: string;  // 十神（保持向后兼容性）- 默认为天干十神
}

// 排盘码识别结果
export interface PaiPanCodeResult {
    code: string;
    name: string;
}

// 视图类型常量
export const PAIPAN_VIEW_TYPE = "paipan-view";
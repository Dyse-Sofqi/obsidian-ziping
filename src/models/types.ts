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
    timeCorrectionEnabled: boolean;
    tag: string;
    province?: string;
    city?: string;
    district?: string;
    longitude?: number;
    latitude?: number;
    showHourPillar?: boolean;
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

// 排盘码识别结果
export interface PaiPanCodeResult {
    code: string;
    name: string;
}

// 视图类型常量
export const PAIPAN_VIEW_TYPE = "paipan-view";
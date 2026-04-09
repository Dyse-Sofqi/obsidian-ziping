/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BaziResult } from './models/types';

// 类型定义
declare global {
    interface Window {
        p: PaipanEngine;
        paipan: any; // paipan 构造函数
    }
}

interface PaipanEngine {
    J: number;
    W: number;
    jq: string[];
    Jtime(jd: number): [number, number, number, number, number, number];
    fatemaps(xb: number, yy: number, mm: number, dd: number, hh: number, mt: number, ss: number, J?: number, W?: number): PaipanResult;
    GetAdjustedJQ(yy: number, adjust: boolean): number[];
    Solar2Lunar(yy: number, mm: number, dd: number): any[];
    dxd: string[];
    ctg: string[];
    cdz: string[];
    calculateQiyunSimplified?: (birthTimestamp: number, solarTermTimestamp: number, xb: number, yearGan: string) => { years: number; months: number; days: number; description: string };
    dateTimeToTimestamp?: (year: number, month: number, day: number, hour: number, minute: number, second: number) => number;

}

interface PaipanResult {
    ctg: string[];
    cdz: string[];
    nyy?: number[];
    nwx?: number[];
    dy?: DayunItemData[];
    zty?: number;
    pty?: number;
    qyy_desc?: string;
    qyy_desc2?: string;
}

interface DayunItemData {
    zqage: number;
    zfma: string;
    zfmb: string;
    zboz?: number;
}



export interface SolarTerm {
    name: string;
    date: Date;
    jr?: number[];
    jd?: number;
    value?: number;
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
}

export class Paipan {
    private engine: PaipanEngine;
    public J: number;
    public W: number;
    private timeCorrectionEnabled: boolean;

    constructor(timeCorrectionEnabled: boolean = false) {
        this.timeCorrectionEnabled = timeCorrectionEnabled;
        if (!window.p) {
            // 如果 window.p 不存在，尝试从 window.paipan 创建
            if (typeof window.paipan === 'function') {
                window.p = new window.paipan();
            } else {
                throw new Error('排盘引擎未初始化，请确保 paipan.js 已被正确加载');
            }
        }
        this.engine = window.p;
        this.J = this.engine.J ?? 120;
        this.W = this.engine.W ?? 35;
    }

    private jdToDate(jd: number): Date {
        const utc = this.engine.Jtime(jd); // [Y,M,D,h,mi,s]
        if (!utc || !Array.isArray(utc) || utc.length < 6) {
            // 降级实现：使用简单的JD到Date转换
            return new Date((jd - 2440587.5) * 86400000);
        }
        const [y, m, d, h, min, s] = utc;
        return new Date(y, m - 1, d, h, min, s);
    }

    private dateToJRArray(date: Date): number[] {
        return [
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds()
        ];
    }

    fatemaps(xb: number, yy: number, mm: number, dd: number, hh: number, mt: number, ss: number, jingdu?: number, weidu?: number): BaziResult {
        // 根据传入的经纬度参数决定是否使用真太阳时计算
        // 与底层paipan.js保持一致的判断逻辑：只要J不为undefined就启用真太阳时
        const finalJingdu = jingdu !== undefined ? jingdu : (this.timeCorrectionEnabled ? this.J : undefined);
        const finalWeidu = weidu !== undefined ? weidu : (this.timeCorrectionEnabled ? this.W : undefined);
        const useTimeCorrection = finalJingdu !== undefined && finalWeidu !== undefined;
        
        // 调用底层引擎，传入经纬度参数
        const result = this.engine.fatemaps(xb, yy, mm, dd, hh, mt, ss, finalJingdu, finalWeidu);
        if (!result || !result.ctg || !result.cdz) {
            throw new Error('排盘失败：fatemaps无效结果');
        }

        // 获取真太阳时（仅在时间校准开启且有设置经纬度时）
        let zty: { hour: number; minute: number; second: number } | undefined;
        if (useTimeCorrection && result.zty !== undefined) {
            // 处理不同的zty数据结构格式
            if (Array.isArray(result.zty) && result.zty.length >= 6) {
                // result.zty 是 [Y, M, D, h, mi, s] 格式，直接取小时、分钟、秒
                zty = {
                    hour: result.zty[3] as number,
                    minute: result.zty[4] as number,
                    second: result.zty[5] as number
                };
            } else if (typeof result.zty === 'number') {
                // result.zty 是时间戳格式，需要转换为小时、分钟、秒
                const ztyDate = new Date(result.zty * 1000);
                zty = {
                    hour: ztyDate.getHours(),
                    minute: ztyDate.getMinutes(),
                    second: ztyDate.getSeconds()
                };
            }
        }

        return {
            gztg: result.ctg,
            dz: result.cdz,
            nyy: result.nyy || [0, 0],
            nwx: result.nwx || [0, 0, 0, 0, 0],
            zty
        };
    }

    getSolarTerms(yy: number): SolarTerm[] {
        const jq = this.engine.GetAdjustedJQ(yy, false);
        if (!Array.isArray(jq) || jq.length < 24) {
            return [];
        }
        
        const solarTerms: SolarTerm[] = [];
        for (let i = 0; i < 24; i++) {
            const jd = jq[i];
            if (typeof jd !== 'number' || isNaN(jd)) {
                continue;
            }
            
            const termDate = this.jdToDate(jd);
            // 获取完整的JD时间数组 [年, 月, 日, 时, 分, 秒]
            const jr = this.engine.Jtime ? this.engine.Jtime(jd) : [];
            
            const jqName = (this.engine.jq && Array.isArray(this.engine.jq) && i < this.engine.jq.length 
                ? this.engine.jq[i] 
                : `节气${i+1}`) || `节气${i+1}`;
            
            solarTerms.push({
                name: jqName,
                date: termDate,
                jr: Array.isArray(jr) && jr.length === 6 ? jr : this.dateToJRArray(termDate), // 确保jr完整性
                jd: jd,
                value: jd
            });
        }
        
        return solarTerms;
    }

    getNearbySolarTerms(yy: number, mm: number, dd: number): NearbySolarTerms {
        const terms = this.getSolarTerms(yy);
        const currentDate = new Date(yy, mm - 1, dd);
        let previous: SolarTerm | null = null;
        let next: SolarTerm | null = null;

        for (const term of terms) {
            if (term.date.getTime() <= currentDate.getTime()) {
                previous = term;
            } else {
                next = term;
                break;
            }
        }

        if (!previous && terms.length > 0) {
            previous = terms[terms.length - 1] || null;
        }

        return {
            previous,
            next,
            interval: previous && next ? Math.floor((next.date.getTime() - previous.date.getTime()) / (1000 * 60 * 60 * 24)) : null
        };
    }

    getCurrentDayun(birthYear: number, birthMonth: number, birthDay: number, gender: number, birthHour?: number, birthMinute?: number, birthSecond?: number, existingResult?: any): CurrentDayunData {
        // 使用用户提供的出生时间参数，如果未提供则使用合理默认值
        const hour = birthHour !== undefined && birthHour >= 0 && birthHour <= 23 ? birthHour : 12;
        const minute = birthMinute !== undefined && birthMinute >= 0 && birthMinute <= 59 ? birthMinute : 30;
        const second = birthSecond !== undefined && birthSecond >= 0 && birthSecond <= 59 ? birthSecond : 0;
        
        // 如果已有计算结果，则直接使用，避免重复计算
        const rt = existingResult || this.engine.fatemaps(gender, birthYear, birthMonth, birthDay, hour, minute, second, this.J, this.W);
        if (!rt || !rt.dy) {
            throw new Error('大运调用失败: 未获取 dy 数据');
        }

        const allDayun: DayunItem[] = rt.dy.slice(0, 9).map((item: any) => ({
            age: item.zqage,
            startYear: birthYear + item.zqage,  // 换运年份 = 出生年份 + 起始岁数
            gan: item.zfma,
            zhi: item.zfmb,
            gz: `${item.zfma}${item.zfmb}`
        }));

        const now = new Date();
        const age = now.getFullYear() - birthYear + 1;
        let currentDayun = allDayun[0];

        for (let i = 0; i < rt.dy.length; i++) {
            const item: any = rt.dy[i];
            if (item && typeof item.zqage === 'number' && typeof item.zboz === 'number') {
                if (age >= item.zqage && age <= item.zboz) {
                    currentDayun = {
                        age: item.zqage,
                        startYear: birthYear + item.zqage,
                        gan: item.zfma,
                        zhi: item.zfmb,
                        gz: `${item.zfma}${item.zfmb}`
                    };
                    break;
                }
            }
        }

        if (!currentDayun) {
            throw new Error('无法计算当前大运');
        }

		return {
				startAge: allDayun[0]?.age ?? 0 ,  // 虚岁: 出生第一年即1岁
				currentDayun,
				liunian: now.getFullYear(),
				allDayun,
				qyy_desc: rt.qyy_desc,
				qyy_desc2: rt.qyy_desc2
		};
    }

    getLunarDate(yy: number, mm: number, dd: number): { year: number; month: number; day: number; isLeap: boolean; monthName: string; yearGanZhi: string } | null {
        try {
            const result = this.engine.Solar2Lunar(yy, mm, dd);
            if (!result || !Array.isArray(result) || result.length < 5) {
                return null;
            }

            const year = Number(result[0]);
            const month = Number(result[1]);
            const day = Number(result[2]);
            const isLeap = Boolean(result[3]);
            const extra = result[4] as { ym?: string; gz?: string } | undefined;

            if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
                return null;
            }

            return {
                year,
                month,
                day,
                isLeap,
                monthName: extra?.ym || '',
                yearGanZhi: extra?.gz || ''
            };
        } catch (error) {
            console.error('获取农历日期失败:', error);
            return null;
        }
    }

    // 农历转公历
    lunarToSolar(yy: number, mm: number, dd: number, isLeap: boolean): { year: number; month: number; day: number } | null {
        try {
            // 调用paipan.js中的Lunar2Solar方法
            const result = (this.engine as any).Lunar2Solar(yy, mm, dd, isLeap);
            if (!result || !Array.isArray(result) || result.length < 3) {
                return null;
            }

            const year = Number(result[0]);
            const month = Number(result[1]);
            const day = Number(result[2]);

            if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
                return null;
            }

            return {
                year,
                month,
                day
            };
        } catch (error) {
            console.error('农历转公历失败:', error);
            return null;
        }
    }

    // 获取指定年份的闰月信息
    getLeapMonth(year: number): number {
        try {
            // 调用paipan.js中的GetZQandSMandLunarMonthCode方法获取月份代码
            const [mc] = (this.engine as any).GetZQandSMandLunarMonthCode(year);
            if (!mc || !Array.isArray(mc)) {
                return 0;
            }

            // 查找闰月
            for (let i = 1; i <= 14; i++) {
                if (mc[i] && mc[i] - Math.floor(mc[i]) > 0) {
                    // 找到闰月，返回月份号（减2是因为mc从0开始，0对应农历11月，1对应农历12月，2对应正月）
                    const leapMonth = Math.floor(mc[i] + 0.5) - 2;
                    if (leapMonth >= 1 && leapMonth <= 12) {
                        return leapMonth;
                    }
                }
            }
            return 0;
        } catch (error) {
            console.error('获取闰月信息失败:', error);
            return 0;
        }
    }

    getLunarDayName(day: number): string {
        if (day >= 1 && day <= 30 && this.engine.dxd && this.engine.dxd[day - 1]) {
            return this.engine.dxd[day - 1]!;
        }
        return day.toString();
    }

    // 获取年份的干支
    getYearGanZhi(year: number): { gan: string; zhi: string } {
        // 干支纪年：以正月初一为界
        // 这里简化计算，实际应该考虑正月初一
        const ganIndex = (year - 4) % 10; // 甲子年是4年
        const zhiIndex = (year - 4) % 12;

        const gan = this.engine.ctg[ganIndex < 0 ? ganIndex + 10 : ganIndex];
        const zhi = this.engine.cdz[zhiIndex < 0 ? zhiIndex + 12 : zhiIndex];

        return { gan: gan || '甲', zhi: zhi || '子' };
    }

    // 判断天干的阴阳属性 (阳干返回true，阴干返回false)
    isYangGan(gan: string): boolean {
        const yangGan = ['甲', '丙', '戊', '庚', '壬'];
        return yangGan.includes(gan);
    }

    // 计算小运 - 以时柱干支为基点，阳年出生的男性、阴年出生的女性顺排，阴年出生的男性、阳年出生的女性逆排
    getXiaoYun(hourGan: string, hourZhi: string, birthYear: number, gender: number, age: number): { gan: string; zhi: string } {
        // 获取出生年的年干
        const birthYearGan = this.getYearGanZhi(birthYear).gan;
        
        // 判断出生年的阴阳属性
        const isYangYear = this.isYangGan(birthYearGan);
        
        // 确定排列方向
        const isMale = gender === 0; // 0=男，1=女
        const isForward = (isYangYear && isMale) || (!isYangYear && !isMale);
        
        // 获取时柱干支在干支表中的索引
        const ganIndex = this.engine.ctg.indexOf(hourGan);
        const zhiIndex = this.engine.cdz.indexOf(hourZhi);
        
        if (ganIndex === -1 || zhiIndex === -1) {
            return { gan: '', zhi: '' };
        }
        
        // 计算步数（1岁小运是时柱后推1位，与时柱相邻）
        const step = age;
        
        // 计算新索引（60年一个完整周期）
        const newGanIndex = isForward 
            ? (ganIndex + step) % 10
            : (ganIndex - step + 1000) % 10; // +1000确保足够大的正数
        
        const newZhiIndex = isForward
            ? (zhiIndex + step) % 12
            : (zhiIndex - step + 1200) % 12; // +1200确保足够大的正数
        
        // 返回小运干支
        return {
            gan: this.engine.ctg[newGanIndex] ?? '',
            zhi: this.engine.cdz[newZhiIndex] ?? ''
        };
    }
    
    /**
     * 计算大运期间所有年份对应的小运
     * @param hourGan 时柱天干
     * @param hourZhi 时柱地支
     * @param birthYear 出生年份
     * @param gender 性别 (0=男,1=女)
     * @param startAge 大运起始年龄
     * @param endAge 大运结束年龄
     * @returns 返回年份到小运的映射
     */
    getXiaoYunForDayun(
        hourGan: string, 
        hourZhi: string, 
        birthYear: number, 
        gender: number, 
        startAge: number, 
        endAge: number
    ): Record<number, { gan: string; zhi: string }> {
        const result: Record<number, { gan: string; zhi: string }> = {};
        
        for (let age = startAge; age <= endAge; age++) {
            const year = birthYear + age;
            result[year] = this.getXiaoYun(hourGan, hourZhi, birthYear, gender, age);
        }
        
        return result;
    }

    /**
     * 简化版起运计算函数 - 调用paipan.js引擎的起运计算
     * 
     * @param birthTimestamp 出生时间戳（毫秒）
     * @param solarTermTimestamp 节令时间戳（毫秒）
     * @param xb 性别（0=男，1=女）
     * @param yearGan 年干（判断顺逆排大运）
     * @returns 起运描述信息
     */
    calculateQiyunSimplified(
        birthTimestamp: number, 
        solarTermTimestamp: number, 
        xb: number, 
        yearGan: string
    ): { years: number; months: number; days: number; description: string } {
        // 调用paipan.js引擎的起运计算函数
        if (this.engine.calculateQiyunSimplified) {
            return this.engine.calculateQiyunSimplified(birthTimestamp, solarTermTimestamp, xb, yearGan);
        } else {
            throw new Error('起运计算失败');
        }
    }

    /**
     * 将标准日期时间转换为时间戳
     * @param year 年
     * @param month 月
     * @param day 日
     * @param hour 小时
     * @param minute 分钟
     * @param second 秒数
     * @returns UNIX时间戳（毫秒）
     */
    dateTimeToTimestamp(year: number, month: number, day: number, hour: number, minute: number, second: number): number {
        if (this.engine.dateTimeToTimestamp) {
            return this.engine.dateTimeToTimestamp(year, month, day, hour, minute, second) * 1000;
        }
        // 降级实现
        const date = new Date(year, month - 1, day, hour, minute, second);
        return date.getTime();
    }

    /**
     * 将节令日期时间转换为时间戳
     * @param jqArray 节气数组 [年, 月, 日, 时, 分, 秒]
     * @param jdValue JD值
     * @returns UNIX时间戳（毫秒）
     */
    jqDateTimeToTimestamp(jqArray: number[], jdValue: number): number {
        if (this.engine.dateTimeToTimestamp && jqArray.length === 6) {
            // 确保数组元素都不是undefined
            const year = jqArray[0] ?? 0;
            const month = jqArray[1] ?? 1;
            const day = jqArray[2] ?? 1;
            const hour = jqArray[3] ?? 0;
            const minute = jqArray[4] ?? 0;
            const second = jqArray[5] ?? 0;
            return this.engine.dateTimeToTimestamp(year, month, day, hour, minute, second) * 1000;
        }
        // 降级实现 - 从JD值计算出日期
        const jd = jdValue + 2440587.5; // 转换为Unix时间戳的基础偏移
        const date = new Date(jd * 86400000);
        return date.getTime();
    }

    /**
     * 查找出生日期前后的节令
     * @param birthYear 出生年份
     * @param birthMonth 出生月份
     * @param birthDay 出生日
     * @param hour 出生小时（用于准确定位）
     * @param minute 出生分钟
     * @param second 出生秒数
     * @param xb 性别（0=男，1=女）
     * @param yearGan 年干（判断顺逆排大运）
     * @returns 起运计算相关信息
     */
    calculateQiyunAdvanced(
        birthYear: number,
        birthMonth: number,
        birthDay: number,
        hour?: number,
        minute?: number,
        second?: number,
        xb?: number,
        yearGan?: string
    ): { 
        previousSolarTerm: SolarTerm | null; 
        nextSolarTerm: SolarTerm | null;
        qiyunInfo: { years: number; months: number; days: number; description: string } | null;
    } {
        const birthDate = new Date(birthYear, birthMonth - 1, birthDay, hour || 12, minute || 30, second || 0);
        
        // 获取相关节气信息
        const nearby = this.getNearbySolarTerms(birthYear, birthMonth, birthDay);
        
        // 如果没有找到相关的节气，返回空值
        if (!nearby.previous && !nearby.next) {
            return {
                previousSolarTerm: null,
                nextSolarTerm: null,
                qiyunInfo: null
            };
        }
        
        let qiyunInfo = null;
        
        // 如果有年干和性别信息，进行完整的起运计算
        if (yearGan && xb !== undefined && nearby.previous && nearby.next) {
            const birthTimestamp = birthDate.getTime();
            
            // 判断大运顺排还是逆排
            const yangGan = ['甲', '丙', '戊', '庚', '壬'];
            const isYangGan = yangGan.includes(yearGan);
            const isMale = xb === 0;
            
            // 阳年男或阴年女 → 顺排；阴年男或阳年女 → 逆排
            const isForward = (isYangGan && isMale) || (!isYangGan && !isMale);
            
            // 根据顺逆排决定使用哪个节气作为计算基准
            const solarTerm = isForward ? nearby.next : nearby.previous;
            const solarTermTimestamp = solarTerm.date.getTime();
            
            try {
                qiyunInfo = this.calculateQiyunSimplified(
                    birthTimestamp,
                    solarTermTimestamp,
                    xb,
                    yearGan
                );
            } catch (error) {
                console.warn('起运计算失败:', error);
            }
        }
        
        return {
            previousSolarTerm: nearby.previous,
            nextSolarTerm: nearby.next,
            qiyunInfo
        };
    }

    // 计算小运 - 男顺女逆
    // 根据出生年份的干支，男命每年顺推，女命每年逆推
    getXiaoYunOld(birthYear: number, gender: number, age: number): { gan: string; zhi: string; year: number; age: number } {
        // 出生年的年干支索引
        const birthGanIndex = (birthYear - 4) % 10;
        const birthZhiIndex = (birthYear - 4) % 12;

        // 男顺推，女逆推
        const direction = (gender === 0) ? 1 : -1; // 0=男，1=女

        // 计算age岁时的年干支
        const offset = direction * age;
        const ganIndex = (birthGanIndex + offset) % 10;
        const zhiIndex = (birthZhiIndex + offset) % 12;

        const adjustedGanIndex = ganIndex < 0 ? ganIndex + 10 : ganIndex;
        const adjustedZhiIndex = zhiIndex < 0 ? zhiIndex + 12 : zhiIndex;

        const gan = this.engine.ctg[adjustedGanIndex] || '甲';
        const zhi = this.engine.cdz[adjustedZhiIndex] || '子';

        return {
            gan,
            zhi,
            year: birthYear + offset,
            age: age
        };
    }

    // 计算十神关系 - 使用paipan.js中的dgs查找表
    getShiShen(dayGan: string, otherGan: string): string {
        const dayIndex = this.engine.ctg.indexOf(dayGan);
        const otherIndex = this.engine.ctg.indexOf(otherGan);

        if (dayIndex === -1 || otherIndex === -1) return '';

        // 使用paipan.js中的dgs查找表：dgs[日干索引][其他干索引] = 十神索引(0-9)
        // 引用paipan.js中的dgs数组
        const dgs: number[][] = [
            [2, 3, 1, 0, 9, 8, 7, 6, 5, 4],  // 甲
            [3, 2, 0, 1, 8, 9, 6, 7, 4, 5],  // 乙
            [5, 4, 2, 3, 1, 0, 9, 8, 7, 6],  // 丙
            [4, 5, 3, 2, 0, 1, 8, 9, 6, 7],  // 丁
            [7, 6, 5, 4, 2, 3, 1, 0, 9, 8],  // 戊
            [6, 7, 4, 5, 3, 2, 0, 1, 8, 9],  // 己
            [9, 8, 7, 6, 5, 4, 2, 3, 1, 0],  // 庚
            [8, 9, 6, 7, 4, 5, 3, 2, 0, 1],  // 辛
            [1, 0, 9, 8, 7, 6, 5, 4, 2, 3],  // 壬
            [0, 1, 8, 9, 6, 7, 4, 5, 3, 2]   // 癸
        ];

        const sss = ['伤', '食', '比', '劫','印', '枭', '官', '杀','财', '才' ];

        const dayRow = dgs[dayIndex];
        if (!dayRow) return '';
        const shiShenIndex = dayRow[otherIndex];
        if (shiShenIndex === undefined) return '';
        return sss[shiShenIndex] || '';
    }

    // 获取十神全称
    getShiShenFull(dayGan: string, otherGan: string): string {
        const dayIndex = this.engine.ctg.indexOf(dayGan);
        const otherIndex = this.engine.ctg.indexOf(otherGan);

        if (dayIndex === -1 || otherIndex === -1) return '';

        const dgs: number[][] = [
            [2, 3, 1, 0, 9, 8, 7, 6, 5, 4],  // 甲
            [3, 2, 0, 1, 8, 9, 6, 7, 4, 5],  // 乙
            [5, 4, 2, 3, 1, 0, 9, 8, 7, 6],  // 丙
            [4, 5, 3, 2, 0, 1, 8, 9, 6, 7],  // 丁
            [7, 6, 5, 4, 2, 3, 1, 0, 9, 8],  // 戊
            [6, 7, 4, 5, 3, 2, 0, 1, 8, 9],  // 己
            [9, 8, 7, 6, 5, 4, 2, 3, 1, 0],  // 庚
            [8, 9, 6, 7, 4, 5, 3, 2, 0, 1],  // 辛
            [1, 0, 9, 8, 7, 6, 5, 4, 2, 3],  // 壬
            [0, 1, 8, 9, 6, 7, 4, 5, 3, 2]   // 癸
        ];

        const sssFull = ['伤官', '食神', '比肩', '劫财', '正印', '偏印', '正官', '偏官', '正财', '偏财'];

        const dayRow = dgs[dayIndex];
        if (!dayRow) return '';
        const shiShenIndex = dayRow[otherIndex];
        if (shiShenIndex === undefined) return '';
        return sssFull[shiShenIndex] || '';
    }

    // 地支藏气
    getCangQi(zhi: string): { main: string; middle: string; residual: string } {
        const map: Record<string, [string, string, string]> = {
            子: ['癸', '', ''], 丑: ['己', '辛', '癸'], 寅: ['甲', '丙', '戊'], 卯: ['乙', '', ''],
            辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己', ''], 未: ['己', '丁', '乙'],
            申: ['庚', '壬', '戊'], 酉: ['辛', '', ''], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲', '']
        };
        const v = map[zhi] || ['', '', ''];
        return { main: v[0] || '', middle: v[1] || '', residual: v[2] || '' };
    }

    // 计算地支十神 - 根据地支的主气（藏干第一个）计算与日干的十神关系
    getZhiShiShen(dayGan: string, zhi: string): string {
        // 地支藏干表（索引0-11对应子到亥）
        const zcg: number[][] = [
            [9, -1, -1],  // 子 - 癸
            [5, 9, 7],    // 丑 - 己辛癸
            [0, 2, 4],    // 寅 - 甲丙戊
            [1, -1, -1],  // 卯 - 乙
            [4, 1, 9],    // 辰 - 戊乙癸
            [2, 4, 6],    // 巳 - 丙庚戊
            [3, 5, -1],   // 午 - 丁己
            [5, 1, 3],    // 未 - 己丁乙
            [6, 8, 4],    // 申 - 庚壬戊
            [7, -1, -1],  // 酉 - 辛
            [4, 7, 3],    // 戌 - 戊辛丁
            [8, 0, -1]    // 亥 - 壬甲
        ];

        const dzIndex = this.engine.cdz.indexOf(zhi);
        if (dzIndex === -1) return '';

        // 获取地支的主气（第一个藏干）
        const zhiCangGan = zcg[dzIndex];
        if (!zhiCangGan || zhiCangGan[0] === undefined || zhiCangGan[0] === -1) return '';
        const mainCangGanIndex: number = zhiCangGan[0];
        if (isNaN(mainCangGanIndex)) return '';

        // 使用dgs表计算十神
        const dayIndex = this.engine.ctg.indexOf(dayGan);
        if (dayIndex === -1) return '';

        const dgs: number[][] = [
            [2, 3, 1, 0, 9, 8, 7, 6, 5, 4],  // 甲
            [3, 2, 0, 1, 8, 9, 6, 7, 4, 5],  // 乙
            [5, 4, 2, 3, 1, 0, 9, 8, 7, 6],  // 丙
            [4, 5, 3, 2, 0, 1, 8, 9, 6, 7],  // 丁
            [7, 6, 5, 4, 2, 3, 1, 0, 9, 8],  // 戊
            [6, 7, 4, 5, 3, 2, 0, 1, 8, 9],  // 己
            [9, 8, 7, 6, 5, 4, 2, 3, 1, 0],  // 庚
            [8, 9, 6, 7, 4, 5, 3, 2, 0, 1],  // 辛
            [1, 0, 9, 8, 7, 6, 5, 4, 2, 3],  // 壬
            [0, 1, 8, 9, 6, 7, 4, 5, 3, 2]   // 癸
        ];

        const sss = ['伤', '食', '比', '劫', '印', '枭', '官', '杀', '财', '才'];

        const dayRow = dgs[dayIndex];
        if (!dayRow) return '';
        const shiShenIndex = dayRow[mainCangGanIndex];
        if (shiShenIndex === undefined) return '';
        return sss[shiShenIndex] || '';
    }

    // 纳音
    getNaYin(gz: string): string {
        const map: Record<string, string> = {
            甲子: '海中金', 乙丑: '海中金', 丙寅: '炉中火', 丁卯: '炉中火', 戊辰: '大林木', 己巳: '大林木',
            庚午: '路旁土', 辛未: '路旁土', 壬申: '剑锋金', 癸酉: '剑锋金', 甲戌: '山头火', 乙亥: '山头火',
            丙子: '涧下水', 丁丑: '涧下水', 戊寅: '城头土', 己卯: '城头土', 庚辰: '白蜡金', 辛巳: '白蜡金',
            壬午: '杨柳木', 癸未: '杨柳木', 甲申: '泉中水', 乙酉: '泉中水', 丙戌: '屋上土', 丁亥: '屋上土',
            戊子: '霹雳火', 己丑: '霹雳火', 庚寅: '松柏木', 辛卯: '松柏木', 壬辰: '长流水', 癸巳: '长流水',
            甲午: '砂中金', 乙未: '砂中金', 丙申: '山下火', 丁酉: '山下火', 戊戌: '平地木', 己亥: '平地木',
            庚子: '壁上土', 辛丑: '壁上土', 壬寅: '金箔金', 癸卯: '金箔金', 甲辰: '佛灯火', 乙巳: '佛灯火',
            丙午: '天河水', 丁未: '天河水', 戊申: '大驿土', 己酉: '大驿土', 庚戌: '钗钏金', 辛亥: '钗钏金',
            壬子: '桑柘木', 癸丑: '桑柘木', 甲寅: '石榴木', 乙卯: '石榴木', 丙辰: '剑锋金', 丁巳: '剑锋金',
            戊午: '松柏木', 己未: '松柏木', 庚申: '长流水', 辛酉: '长流水', 壬戌: '路旁土', 癸亥: '路旁土'
        };
        return map[gz] || '';
    }

    // 计算十二长生状态 - 参考paipan.js中的szs数组和计算公式
    // szs: 日干对地支为"子"者所对应的运程代码 [甲,乙,丙,丁,戊,己,庚,辛,壬,癸]
    // 十二长生顺序: 长生, 沐浴, 冠带, 临官, 帝旺, 衰, 病, 死, 墓, 绝, 胎, 养
    getZhangSheng(dayGan: string, zhi: string): string {
        const ctg = this.engine.ctg; // 十天干
        const cdz = this.engine.cdz; // 十二地支
        const czs = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"];

        const dayIndex = ctg.indexOf(dayGan);
        const zhiIndex = cdz.indexOf(zhi);

        if (dayIndex === -1 || zhiIndex === -1) return '';

        // szs数组：日干对地支为"子"者所对应的运程代码
        const szs = [1, 6, 10, 9, 10, 9, 7, 0, 4, 3];
        const szsValue = szs[dayIndex];
        if (szsValue === undefined) return '';

        // 计算公式: (24 + szs[日干索引] + (-1)^日干索引 * 地支索引) % 12
        // 阳干用加法，阴干用减法
        const isYang = dayIndex % 2 === 0; // 0,2,4,6,8 为阳干
        const offset = isYang ? zhiIndex : -zhiIndex;
        const zhangShengIndex = (24 + szsValue + offset) % 12;

        return czs[zhangShengIndex] || '';
    }

    // 星运：日柱天干对应各柱地支的十二长生状态
    getXingYun(dayGan: string, zhi: string): string {
        return this.getZhangSheng(dayGan, zhi);
    }

    // 自坐：各柱天干对应本柱地支的十二长生状态
    getZiZuo(gan: string, zhi: string): string {
        return this.getZhangSheng(gan, zhi);
    }

    getXunKong(gz: string): string {
        if (!gz || gz.length < 2) return '';

        // 六十甲子
        const gzArray = [
            '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
            '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
            '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
            '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
            '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
            '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'
        ];

        // 查找干支在六十甲子中的序数
        const index = gzArray.indexOf(gz);
        if (index === -1) return '';

        // 根据序数判断该柱属于哪一旬，返回对应的空亡地支
        // 序数 0-9：甲子旬（甲子到癸酉）：空戌亥
        // 序数 10-19：甲戌旬（甲戌到癸未）：空申酉
        // 序数 20-29：甲申旬（甲申到癸巳）：空午未
        // 序数 30-39：甲午旬（甲午到癸卯）：空辰巳
        // 序数 40-49：甲辰旬（甲辰到癸丑）：空寅卯
        // 序数 50-59：甲寅旬（甲寅到癸亥）：空子丑
        const xunKongMap: Record<number, string> = {
            0: '戌亥', 1: '戌亥', 2: '戌亥', 3: '戌亥', 4: '戌亥', 5: '戌亥', 6: '戌亥', 7: '戌亥', 8: '戌亥', 9: '戌亥',
            10: '申酉', 11: '申酉', 12: '申酉', 13: '申酉', 14: '申酉', 15: '申酉', 16: '申酉', 17: '申酉', 18: '申酉', 19: '申酉',
            20: '午未', 21: '午未', 22: '午未', 23: '午未', 24: '午未', 25: '午未', 26: '午未', 27: '午未', 28: '午未', 29: '午未',
            30: '辰巳', 31: '辰巳', 32: '辰巳', 33: '辰巳', 34: '辰巳', 35: '辰巳', 36: '辰巳', 37: '辰巳', 38: '辰巳', 39: '辰巳',
            40: '寅卯', 41: '寅卯', 42: '寅卯', 43: '寅卯', 44: '寅卯', 45: '寅卯', 46: '寅卯', 47: '寅卯', 48: '寅卯', 49: '寅卯',
            50: '子丑', 51: '子丑', 52: '子丑', 53: '子丑', 54: '子丑', 55: '子丑', 56: '子丑', 57: '子丑', 58: '子丑', 59: '子丑'
        };

        return xunKongMap[index] || '';
    }

    // 获取天干的五行属性
    getGanWuXing(gan: string): string {
        const map: Record<string, string> = {
            甲: '木', 乙: '木',
            丙: '火', 丁: '火',
            戊: '土', 己: '土',
            庚: '金', 辛: '金',
            壬: '水', 癸: '水'
        };
        return map[gan] || '';
    }

    // 获取地支的五行属性
    getZhiWuXing(zhi: string): string {
        const map: Record<string, string> = {
            寅: '木', 卯: '木',
            巳: '火', 午: '火',
            申: '金', 酉: '金',
            亥: '水', 子: '水',
            辰: '土', 戌: '土', 丑: '土', 未: '土'
        };
        return map[zhi] || '';
    }

    // 根据年柱干支筛选年份
    filterYearsByGanZhi(yearGan: string, yearZhi: string, monthZhi: string = '', dayGan: string = '', dayZhi: string = '', startYear: number = 1900, endYear: number = 2060): number[] {
        const result: number[] = [];
        for (let year = startYear; year <= endYear; year++) {
            const yearGanZhi = this.getYearGanZhi(year);
            if (yearGanZhi.gan === yearGan && yearGanZhi.zhi === yearZhi) {
                // 如果有传入月份和日干支，进行特殊处理
                if (monthZhi && dayGan && dayZhi) {
                    if (monthZhi === '子') {
                        // 子月特殊处理：检查12月6日至12月31日的日干支
                        let foundMatch = false;
                        for (let day = 6; day <= 31; day++) {
                            const bazi = this.fatemaps(0, year, 12, day, 12, 0, 0);
                            if (bazi.gztg[2] === dayGan && bazi.dz[2] === dayZhi) {
                                foundMatch = true;
                                break;
                            }
                        }
                        // 如果都不符合，年份数值+1后返回（但需要避免重复和超出范围）
                        if (!foundMatch && year + 1 <= endYear) {
                            result.push(year + 1);
                        }
                    } else if (monthZhi === '丑') {
                        // 丑月特殊处理：年份数值+1后返回（但需要避免重复和超出范围）
                        if (year + 1 <= endYear) {
                            result.push(year + 1);
                        }
                    }
                }
                // 其他月份或没有传入月份信息时，直接添加年份
                result.push(year);
            }
        }
        return result;
    }

    // 根据日柱干支筛选年份中的日期
    filterDatesByDayGanZhi(years: number[], dayGan: string, dayZhi: string): { year: number; month: number; day: number }[] {
        const result: { year: number; month: number; day: number }[] = [];
        
        for (const year of years) {
            // 遍历该年的每一天
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);
            
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const bazi = this.fatemaps(0, year, date.getMonth() + 1, date.getDate(), 12, 0, 0);
                if (bazi.gztg[2] === dayGan && bazi.dz[2] === dayZhi) {
                    result.push({
                        year: year,
                        month: date.getMonth() + 1,
                        day: date.getDate()
                    });
                }
            }
        }
        return result;
    }

    // 根据时柱地支获取时辰开始时间
    getHourStartByZhi(hourZhi: string, isLateZi: boolean = false): number {
        // 地支顺序：子丑寅卯辰巳午未申酉戌亥
        const zhiOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
        const zhiIndex = zhiOrder.indexOf(hourZhi);
        
        if (zhiIndex === -1) return 0;
        
        // 晚子时（23:00-24:00）返回23
        if (hourZhi === '子' && isLateZi) return 23;
        
        // 正常情况下，子时从23:00开始，但早子时从0:00开始
        // 这里我们默认返回早子时（0:00）
        if (hourZhi === '子') return 0;
        
        // 其他时辰：丑时1:00，寅时3:00，...
        return zhiIndex * 2;
    }

    // 筛选符合四柱干支的时间
    filterBaziByFourPillars(
        yearGan: string, yearZhi: string,
        monthGan: string, monthZhi: string,
        dayGan: string, dayZhi: string,
        hourGan: string, hourZhi: string,
        isLateZi: boolean = false
    ): { year: number; month: number; day: number; hour: number }[] {
        // 第一步：根据年柱干支筛选年份
        const matchingYears = this.filterYearsByGanZhi(yearGan, yearZhi, monthZhi, dayGan, dayZhi);
        
        // 第二步：根据日柱干支筛选日期
        const matchingDates = this.filterDatesByDayGanZhi(matchingYears, dayGan, dayZhi);
        
        // 第三步：根据时柱地支和月柱干支筛选时间
        const result: { year: number; month: number; day: number; hour: number }[] = [];
        
        for (const date of matchingDates) {
            // 获取时辰开始时间
            const hourStart = this.getHourStartByZhi(hourZhi, isLateZi);
            
            // 计算该日的四柱干支
            const bazi = this.fatemaps(0, date.year, date.month, date.day, hourStart, 0, 0);
            
            // 检查月柱干支是否匹配
            if (bazi.gztg[1] === monthGan && bazi.dz[1] === monthZhi) {
                // 检查时柱干支是否匹配
                if (bazi.gztg[3] === hourGan && bazi.dz[3] === hourZhi) {
                    result.push({
                        year: date.year,
                        month: date.month,
                        day: date.day,
                        hour: hourStart
                    });
                }
            }
        }
        
        return result;
    }
}

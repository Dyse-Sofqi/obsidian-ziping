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
}

interface PaipanResult {
    ctg: string[];
    cdz: string[];
    nyy?: number[];
    nwx?: number[];
    dy?: DayunItemData[];
    zty?: number;
    pty?: number;
}

interface DayunItemData {
    zqage: number;
    zfma: string;
    zfmb: string;
    zboz?: number;
}

export interface BaziResult {
    gztg: string[];
    dz: string[];
    nyy: number[];
    nwx: number[];
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
}

export class Paipan {
    private engine: PaipanEngine;
    public J: number;
    public W: number;

    constructor() {
        if (!window.p) {
            // 如果 window.p 不存在，尝试从 window.paipan 创建
            if (typeof window.paipan === 'function') {
                window.p = new (window.paipan as any)();
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
            return new Date(NaN);
        }
        const [y, m, d, h, min, s] = utc;
        return new Date(y, m - 1, d, h, min, s);
    }

    fatemaps(xb: number, yy: number, mm: number, dd: number, hh: number, mt: number, ss: number): BaziResult {
        const result = this.engine.fatemaps(xb, yy, mm, dd, hh, mt, ss, this.J, this.W);
        if (!result || !result.ctg || !result.cdz) {
            throw new Error('排盘失败：fatemaps无效结果');
        }

        // 获取真太阳时（如果有设置经纬度）
        let zty: { hour: number; minute: number; second: number } | undefined;
        if (result.zty !== undefined) {
            const ztyDate = this.jdToDate(result.zty);
            zty = {
                hour: ztyDate.getHours(),
                minute: ztyDate.getMinutes(),
                second: ztyDate.getSeconds()
            };
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
        if (!Array.isArray(jq)) {
            return [];
        }
        return jq.slice(0, 24).map((jd: number, index: number) => ({
            name: this.engine.jq[index] || '未知节气',
            date: this.jdToDate(jd)
        }));
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

    getCurrentDayun(birthYear: number, birthMonth: number, birthDay: number, gender: number): CurrentDayunData {
        const rt = this.engine.fatemaps(gender, birthYear, birthMonth, birthDay, 12, 0, 0, this.J, this.W);
        if (!rt || !rt.dy) {
            throw new Error('大运调用失败: 未获取 dy 数据');
        }

        const allDayun: DayunItem[] = rt.dy.slice(0, 9).map(item => ({
            age: item.zqage,
            gan: item.zfma,
            zhi: item.zfmb,
            gz: `${item.zfma}${item.zfmb}`
        }));

        const now = new Date();
        const age = now.getFullYear() - birthYear;
        let currentDayun = allDayun[0];

        for (let i = 0; i < rt.dy.length; i++) {
            const item = rt.dy[i];
            if (item && typeof item.zqage === 'number' && typeof item.zboz === 'number') {
                if (age >= item.zqage && age <= item.zboz) {
                    currentDayun = { age: item.zqage, gan: item.zfma, zhi: item.zfmb, gz: `${item.zfma}${item.zfmb}` };
                    break;
                }
            }
        }

        if (!currentDayun) {
            throw new Error('无法计算当前大运');
        }

        return {
            startAge: allDayun[0]?.age ?? 0,
            currentDayun,
            liunian: now.getFullYear(),
            allDayun
        };
    }

    getLunarDate(yy: number, mm: number, dd: number): { year: number; month: number; day: number; isLeap: boolean; monthName: string; yearGanZhi: string } | null {
        try {
            const result = this.engine.Solar2Lunar(yy, mm, dd);
            if (!result || !Array.isArray(result) || result.length < 5) {
                return null;
            }

            const [year, month, day, isLeap, extra] = result;
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

    getXingYun(dayGan: string, zhi: string): string {
        return `${dayGan}${zhi}`; // 简化：原始星运需要规则，这里先以组合展示
    }

    getZiZuo(gan: string, zhi: string): string {
        return `${gan}${zhi}`; // 简化：暂展示本气组合
    }

    getXunKong(gz: string): string {
        const map: Record<string, string> = {
            甲子: '戌亥', 乙丑: '戌亥', 丙寅: '申酉', 丁卯: '申酉', 戊辰: '午未', 己巳: '午未',
            庚午: '辰巳', 辛未: '辰巳', 壬申: '寅卯', 癸酉: '寅卯', 甲戌: '子丑', 乙亥: '子丑',
            丙子: '戌亥', 丁丑: '戌亥', 戊寅: '申酉', 己卯: '申酉', 庚辰: '午未', 辛巳: '午未',
            壬午: '辰巳', 癸未: '辰巳', 甲申: '寅卯', 乙酉: '寅卯', 丙戌: '子丑', 丁亥: '子丑',
            戊子: '戌亥', 己丑: '戌亥', 庚寅: '申酉', 辛卯: '申酉', 壬辰: '午未', 癸巳: '午未',
            甲午: '辰巳', 乙未: '辰巳', 丙申: '寅卯', 丁酉: '寅卯', 戊戌: '子丑', 己亥: '子丑',
            庚子: '戌亥', 辛丑: '戌亥', 壬寅: '申酉', 癸卯: '申酉', 甲辰: '午未', 乙巳: '午未',
            丙午: '辰巳', 丁未: '辰巳', 戊申: '寅卯', 己酉: '寅卯', 庚戌: '子丑', 辛亥: '子丑',
            壬子: '戌亥', 癸丑: '戌亥'
        };
        return map[gz] || '';
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
}

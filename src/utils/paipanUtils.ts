// 排盘工具函数
// 从BaziView.ts和TimeSettingModal.ts中提取的排盘相关工具函数
import { Paipan } from '../Paipan';

/**
 * 创建Paipan实例的便捷函数
 */
export function createPaipanInstance(timeCorrectionEnabled: boolean = false, longitude: number = 0, latitude: number = 0): Paipan {
    const paipan = new Paipan(timeCorrectionEnabled);
    paipan.J = longitude;
    paipan.W = latitude;
    return paipan;
}

/**
 * 获取天干的五行属性
 */
export function getGanWuXing(gan: string): string {
    const map: Record<string, string> = {
        '甲': '木', '乙': '木', '丙': '火', '丁': '火',
        '戊': '土', '己': '土', '庚': '金', '辛': '金',
        '壬': '水', '癸': '水'
    };
    return map[gan] || '';
}

/**
 * 获取地支的五行属性
 */
export function getZhiWuXing(zhi: string): string {
    const map: Record<string, string> = {
        '子': '水', '丑': '土', '寅': '木', '卯': '木',
        '辰': '土', '巳': '火', '午': '火', '未': '土',
        '申': '金', '酉': '金', '戌': '土', '亥': '水'
    };
    return map[zhi] || '';
}

/**
 * 根据五行获取对应的CSS类名颜色
 */
export function getWuXingColorClass(wuxing: string): string {
    const colorMap: Record<string, string> = {
        '木': 'green',
        '火': 'red',
        '土': 'yellow',
        '金': 'white',
        '水': 'blue'
    };
    const color = colorMap[wuxing] || 'default';
    return `c-${color}`;
}

/**
 * 获取天干的阴阳属性
 * true为阳，false为阴
 */
export function getGanYinYang(gan: string): boolean {
    const yangGan = ['甲', '丙', '戊', '庚', '壬'];
    return yangGan.includes(gan);
}

/**
 * 获取地支的阴阳属性
 * true为阳，false为阴
 */
export function getZhiYinYang(zhi: string): boolean {
    const yangZhi = ['子', '寅', '辰', '午', '申', '戌'];
    return yangZhi.includes(zhi);
}

/**
 * 检查干支是否匹配阴阳属性
 * 阳干配阳支，阴干配阴支
 */
export function checkGanZhiYinYangMatch(gan: string, zhi: string): boolean {
    const ganYang = getGanYinYang(gan);
    const zhiYang = getZhiYinYang(zhi);
    return ganYang === zhiYang;
}

/**
 * 获取天干列表
 */
export function getGanList(): string[] {
    return ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
}

/**
 * 获取地支列表
 */
export function getZhiList(): string[] {
    return ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
}

/**
 * 获取干支组合（六十甲子）
 */
export function getGanZhiList(): string[] {
    const ganList = getGanList();
    const zhiList = getZhiList();
    const ganZhiList: string[] = [];
    
    for (let i = 0; i < 60; i++) {
        const ganIndex = i % 10;
        const zhiIndex = i % 12;
        ganZhiList.push(`${ganList[ganIndex]}${zhiList[zhiIndex]}`);
    }
    
    return ganZhiList;
}

/**
 * 检查是否为有效的干支
 */
export function isValidGanZhi(ganZhi: string): boolean {
    if (ganZhi.length !== 2) return false;
    const gan = ganZhi[0];
    const zhi = ganZhi[1];
    if (!gan || !zhi) return false;
    return getGanList().includes(gan) && getZhiList().includes(zhi);
}

/**
 * 从八字结果中获取四柱显示文本
 */
export function formatFourPillars(bazi: { gztg: string[], dz: string[] }): string {
    if (!bazi.gztg || !bazi.dz || bazi.gztg.length < 4 || bazi.dz.length < 4) {
        return '';
    }
    
    const pillars = [
        `${bazi.gztg[0]}${bazi.dz[0]}`,
        `${bazi.gztg[1]}${bazi.dz[1]}`,
        `${bazi.gztg[2]}${bazi.dz[2]}`,
        `${bazi.gztg[3]}${bazi.dz[3]}`
    ];
    
    return `${pillars[0]}年 ${pillars[1]}月 ${pillars[2]}日 ${pillars[3]}时`;
}

/**
 * 计算十神关系（简短版）
 */
export function getShiShenShort(dayGan: string, otherGan: string, paipan: Paipan): string {
    return paipan.getShiShen(dayGan, otherGan);
}

/**
 * 计算十神关系（完整版）
 */
export function getShiShenFull(dayGan: string, otherGan: string, paipan: Paipan): string {
    return paipan.getShiShenFull(dayGan, otherGan);
}

/**
 * 根据地支计算十神（根据地支的主气）
 */
export function getZhiShiShen(dayGan: string, zhi: string, paipan: Paipan): string {
    return paipan.getZhiShiShen(dayGan, zhi);
}

/**
 * 获取藏干
 */
export function getCangQi(zhi: string, paipan: Paipan): { main: string; middle: string; residual: string } {
    return paipan.getCangQi(zhi);
}

/**
 * 获取纳音
 */
export function getNaYin(ganZhi: string, paipan: Paipan): string {
    return paipan.getNaYin(ganZhi);
}

/**
 * 获取星运（十二长生状态）
 */
export function getXingYun(dayGan: string, zhi: string, paipan: Paipan): string {
    return paipan.getXingYun(dayGan, zhi);
}

/**
 * 获取自坐（天干对地支的十二长生状态）
 */
export function getZiZuo(gan: string, zhi: string, paipan: Paipan): string {
    return paipan.getZiZuo(gan, zhi);
}

/**
 * 获取空亡
 */
export function getXunKong(ganZhi: string, paipan: Paipan): string {
    return paipan.getXunKong(ganZhi);
}

/**
 * 获取年份的干支
 */
export function getYearGanZhi(year: number, paipan: Paipan): { gan: string, zhi: string } {
    return paipan.getYearGanZhi(year);
}

/**
 * 获取农历日期信息
 */
export function getLunarDate(year: number, month: number, day: number, paipan: Paipan) {
    return paipan.getLunarDate(year, month, day);
}

/**
 * 获取附近节气信息
 */
export function getNearbySolarTerms(year: number, month: number, day: number, paipan: Paipan) {
    return paipan.getNearbySolarTerms(year, month, day);
}

/**
 * 计算大运数据
 */
export function calculateDayun(gender: number, year: number, month: number, day: number, paipan: Paipan) {
    try {
        return paipan.getCurrentDayun(year, month, day, gender);
    } catch (error) {
        console.error('计算大运流年失败:', error);
        // 返回默认值
        return {
            startAge: 0,
            currentDayun: {
                age: 0,
                startYear: year,
                gan: '',
                zhi: '',
                gz: ''
            },
            liunian: year,
            allDayun: []
        };
    }
}

/**
 * 计算八字
 */
export function calculateBazi(
    gender: number,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    paipan: Paipan
) {
    return paipan.fatemaps(gender, year, month, day, hour, minute, second);
}

/**
 * 根据时柱天干地支计算小运
 */
export function calculateXiaoYun(
    hourGan: string,
    hourZhi: string,
    birthYear: number,
    gender: number,
    age: number,
    paipan: Paipan
) {
    return paipan.getXiaoYun(hourGan, hourZhi, birthYear, gender, age);
}

/**
 * 根据四柱干支筛选匹配的日期
 */
export function filterBaziByFourPillars(
    yearGan: string, yearZhi: string,
    monthGan: string, monthZhi: string,
    dayGan: string, dayZhi: string,
    hourGan: string, hourZhi: string,
    isLateZi: boolean = false,
    paipan: Paipan
) {
    return paipan.filterBaziByFourPillars(
        yearGan, yearZhi,
        monthGan, monthZhi,
        dayGan, dayZhi,
        hourGan, hourZhi,
        isLateZi
    );
}

/**
 * 将农历转换为公历
 */
export function lunarToSolar(
    lunarYear: number,
    lunarMonth: number,
    lunarDay: number,
    isLeap: boolean,
    paipan: Paipan
) {
    return paipan.lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap);
}

/**
 * 获取闰月信息
 */
export function getLeapMonth(year: number, paipan: Paipan): number {
    return paipan.getLeapMonth(year);
}

/**
 * 检查时间是否需要校准（真太阳时）
 */
export function shouldApplyTimeCorrection(longitude: number): boolean {
    // 北京时间中心经度为120°E
    const beijingLongitude = 120;
    // 经度差超过1度可能需要校准
    return Math.abs(longitude - beijingLongitude) > 1;
}

/**
 * 计算时差（分钟）
 */
export function calculateTimeDifference(longitude: number): number {
    // 每度经度对应4分钟时差
    const beijingLongitude = 120;
    return (longitude - beijingLongitude) * 4;
}

/**
 * 格式化真太阳时显示
 */
export function formatTrueSolarTime(zty: { hour: number; minute: number; second: number } | undefined): string {
    if (!zty) return '';
    return `${String(zty.hour).padStart(2, '0')}:${String(zty.minute).padStart(2, '0')}:${String(zty.second).padStart(2, '0')}`;
}
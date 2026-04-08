/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// 八字计算和显示服务
import { Paipan } from '../Paipan';
import { CurrentBaziData, BaziResult, CurrentDayunData, NearbySolarTerms, DayunItem } from '../models/types';

export class BaziService {
    private paipan: Paipan;

    constructor(paipan: Paipan) {
        this.paipan = paipan;
    }

    // 计算八字
    async calculateBazi(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        second: number,
        gender: number,
        name: string,
        timeCorrectionEnabled: boolean,
        tag: string,
        existingData?: CurrentBaziData | null
    ): Promise<CurrentBaziData> {
        // 如果有现有的地理位置信息，应用到 Paipan 引擎中
        if (existingData && existingData.longitude && existingData.latitude) {
            this.paipan.J = existingData.longitude;
            this.paipan.W = existingData.latitude;
        }

        // 使用排盘引擎计算八字（获取完整结果）
        const engineResult = (this.paipan as any).engine.fatemaps(
            gender,
            year,
            month,
            day,
            hour,
            minute,
            second,
            timeCorrectionEnabled ? (this.paipan as any).J : undefined,
            timeCorrectionEnabled ? (this.paipan as any).W : undefined
        );

        // 从完整结果中提取 BaziResult
        const baziResult: BaziResult = {
            gztg: engineResult.ctg,
            dz: engineResult.cdz,
            nyy: engineResult.nyy || [0, 0],
            nwx: engineResult.nwx || [0, 0, 0, 0, 0],
            zty: engineResult.zty
        };

        // 获取当前节气信息、计算大运流年
        const solarTerms = this.getNearbySolarTerms(year, month, day);
        const dayunData = this.calculateDayun(gender, year, month, day, hour, engineResult);

        // 确定当前大运索引
        const currentYear = new Date().getFullYear();
        let selectedDayunIndex = 0;
        let selectedLiunianIndex = 0;
        
        // 找到包含当前年份的大运
        if (dayunData.allDayun && dayunData.allDayun.length > 0) {
            // 计算出生年份
            const birthYear = year;
            
            // 寻找当前年份所在的大运
            for (let i = 0; i < dayunData.allDayun.length; i++) {
                const dy = dayunData.allDayun[i];
                if (dy && dy.startYear <= currentYear) {
                    // 当前大运索引
                    selectedDayunIndex = i;
                    // 计算在当前大运中的流年索引（从大运开始年份算起）
                    selectedLiunianIndex = Math.max(0, currentYear - dy.startYear);
                }
            }
            
            // 如果没有找到包含当前年份的大运（说明还未起运），则选择第一个大运
            const firstDayun = dayunData.allDayun[0];
            if (firstDayun && currentYear < birthYear + firstDayun.age) {
                selectedDayunIndex = 0;
                selectedLiunianIndex = Math.max(0, currentYear - birthYear);
            }
        }

        // 构建当前八字数据，包含地理位置信息
        const currentData: CurrentBaziData = {
            year,
            month,
            day,
            hour,
            minute,
            second,
            amOrPm: hour >= 12 ? '下午' : '上午',
            gender,
            name,
            bazi: baziResult,
            solarTerms,
            dayun: dayunData,
            selectedDayunIndex,
            selectedLiunianIndex,
            timeCorrectionEnabled,
            tag
        };

        // 保留现有的地理位置信息
        if (existingData) {
            currentData.province = existingData.province;
            currentData.city = existingData.city;
            currentData.district = existingData.district;
            currentData.longitude = existingData.longitude;
            currentData.latitude = existingData.latitude;
        }

        return currentData;
    }

    // 获取附近节气信息
    private getNearbySolarTerms(year: number, month: number, day: number): NearbySolarTerms {
        try {
            return this.paipan.getNearbySolarTerms(year, month, day);
        } catch (error) {
            console.error('获取节气失败:', error);
            return {
                previous: null,
                next: null,
                interval: null
            };
        }
    }

    // 计算大运流年
    private calculateDayun(
        gender: number,
        year: number,
        month: number,
        day: number,
        hour: number,
        engineResult: any
    ): CurrentDayunData {
        try {
            // 将第一次 fatemaps() 的结果传递给 getCurrentDayun() 方法，避免重复计算
            return this.paipan.getCurrentDayun(year, month, day, gender, hour, undefined, undefined, engineResult);
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
}
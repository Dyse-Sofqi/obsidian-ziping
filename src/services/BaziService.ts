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
        tag: string
    ): Promise<CurrentBaziData> {
        // 使用排盘引擎计算八字
        const baziResult = this.paipan.fatemaps(
            gender,
            year,
            month,
            day,
            hour,
            minute,
            second
        );

        // 获取当前节气信息
        const solarTerms = this.getNearbySolarTerms(year, month, day);

        // 计算大运流年
        const dayunData = this.calculateDayun(gender, year, month, day, hour, baziResult);

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

        // 构建当前八字数据
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

        return currentData;
    }

    // 获取附近节气信息
    private getNearbySolarTerms(year: number, month: number, day: number): NearbySolarTerms {
        try {
            return this.paipan.getNearbySolarTerms(year, month, day);
        } catch (error) {
            console.error('获取节气信息失败:', error);
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
        baziResult: BaziResult
    ): CurrentDayunData {
        try {
            // 注意：Paipan类的getCurrentDayun方法只接受4个参数：birthYear, birthMonth, birthDay, gender
            // hour参数在getCurrentDayun中未使用，所以忽略hour参数
            return this.paipan.getCurrentDayun(year, month, day, gender);
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

    // 渲染八字内容
    renderBaziContent(container: Element, data: CurrentBaziData) {
        // 创建内容区域
        const contentDiv = container.createEl('div', { cls: 'bazi-content' });

        // 显示四柱八字
        this.renderFourPillars(contentDiv, data);

        // 显示大运流年
        this.renderDayun(contentDiv, data);

        // 显示其他信息
        this.renderAdditionalInfo(contentDiv, data);
    }

    // 渲染四柱八字
    private renderFourPillars(container: Element, data: CurrentBaziData) {
        const bazi = data.bazi;
        
        // 创建四柱八字容器
        const baziContainer = container.createEl('div', { cls: 'bazi-four-pillars' });
        
        // 显示天干
        const ganRow = baziContainer.createEl('div', { cls: 'bazi-row' });
        ganRow.createEl('span', { text: '天干: ' });
        bazi.gztg.forEach((gan, index) => {
            ganRow.createEl('span', { text: gan, cls: 'bazi-gan' });
            if (index < 3) ganRow.createEl('span', { text: ' ' });
        });

        // 显示地支
        const zhiRow = baziContainer.createEl('div', { cls: 'bazi-row' });
        zhiRow.createEl('span', { text: '地支: ' });
        bazi.dz.forEach((zhi, index) => {
            zhiRow.createEl('span', { text: zhi, cls: 'bazi-zhi' });
            if (index < 3) zhiRow.createEl('span', { text: ' ' });
        });
    }

    // 渲染大运流年
    private renderDayun(container: Element, data: CurrentBaziData) {
        const dayun = data.dayun;
        
        const dayunContainer = container.createEl('div', { cls: 'bazi-dayun' });
        dayunContainer.createEl('h4', { text: '大运流年' });

        // 显示当前大运
        if (dayun.currentDayun) {
            const currentDayunEl = dayunContainer.createEl('div', { cls: 'bazi-current-dayun' });
            currentDayunEl.createEl('span', { 
                text: `当前大运: ${dayun.currentDayun.gan}${dayun.currentDayun.zhi} (${dayun.currentDayun.age}岁)` 
            });
        }

        // 显示流年
        const liunianEl = dayunContainer.createEl('div', { cls: 'bazi-liunian' });
        liunianEl.createEl('span', { text: `流年: ${dayun.liunian}` });

        // 显示所有大运
        if (dayun.allDayun && dayun.allDayun.length > 0) {
            const allDayunEl = dayunContainer.createEl('div', { cls: 'bazi-all-dayun' });
            allDayunEl.createEl('p', { text: '全部大运:' });
            
            const dayunList = allDayunEl.createEl('ul');
            dayun.allDayun.forEach((dy, index) => {
                const li = dayunList.createEl('li');
                li.setText(`${dy.startYear}年 ${dy.gan}${dy.zhi} (${dy.age}岁)`);
            });
        }
    }

    // 渲染其他信息
    private renderAdditionalInfo(container: Element, data: CurrentBaziData) {
        const infoContainer = container.createEl('div', { cls: 'bazi-additional-info' });

        // 显示节气信息
        if (data.solarTerms) {
            const solarTermsEl = infoContainer.createEl('div', { cls: 'bazi-solar-terms' });
            solarTermsEl.createEl('h5', { text: '节气信息' });
            
            if (data.solarTerms.previous) {
                solarTermsEl.createEl('p', { 
                    text: `上一个节气: ${data.solarTerms.previous.name} (${data.solarTerms.previous.date.toLocaleDateString()})` 
                });
            }
            if (data.solarTerms.next) {
                solarTermsEl.createEl('p', { 
                    text: `下一个节气: ${data.solarTerms.next.name} (${data.solarTerms.next.date.toLocaleDateString()})` 
                });
            }
        }

        // 显示时间校准状态
        if (data.timeCorrectionEnabled) {
            infoContainer.createEl('p', { text: '✓ 已启用时间校准', cls: 'bazi-time-correction' });
        }

        // 显示标签
        if (data.tag) {
            infoContainer.createEl('p', { text: `标签: ${data.tag}`, cls: 'bazi-tag' });
        }
    }
}
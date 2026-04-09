// 大运和小运显示组件
// 从BaziView.ts中提取的大运显示功能
import { Paipan } from '../../Paipan';
import { CurrentBaziData, DayunItem } from '../../models/types';

export class DayunDisplay {
    private paipan: Paipan;
    private onDayunSelect?: (index: number) => void;
    private onLiunianSelect?: (dayunIndex: number, liunianIndex: number) => void;
    private onXiaoyunSelect?: () => void;

    constructor(paipan: Paipan) {
        this.paipan = paipan;
    }

    // 设置回调函数
    setCallbacks(
        onDayunSelect?: (index: number) => void,
        onLiunianSelect?: (dayunIndex: number, liunianIndex: number) => void,
        onXiaoyunSelect?: () => void
    ) {
        this.onDayunSelect = onDayunSelect;
        this.onLiunianSelect = onLiunianSelect;
        this.onXiaoyunSelect = onXiaoyunSelect;
    }

    // 显示大运信息
    displayDayunInfo(container: Element, data: CurrentBaziData) {
        // 大运信息
        const dayunDiv = container.createEl('div');
        dayunDiv.addClass('dayun-info');

        // 当前大运和流年 - 显示选中的大运或小运和流年
        let displayText = '';
        if (data.selectedDayunIndex === -1) {
            // 小运模式
            const xiaoyunYear = data.year + (data.selectedLiunianIndex ?? 0);
            const age = xiaoyunYear - data.year + 1;
            const hourGan = data.bazi.gztg[3] || '';
            const hourZhi = data.bazi.dz[3] || '';
            const xiaoYun = this.paipan.getXiaoYun(hourGan, hourZhi, data.year, data.gender, age);
            const selectedLiunianYear = data.year + (data.selectedLiunianIndex ?? 0);
            const liuNianGanZhi = this.paipan.getYearGanZhi(selectedLiunianYear);
            displayText = `小运：${xiaoYun.gan}${xiaoYun.zhi}。流年：${xiaoyunYear}${liuNianGanZhi.gan}${liuNianGanZhi.zhi}年，${age}岁`;
        } else {
            const selectedDayunForDisplay = data.dayun.allDayun[data.selectedDayunIndex ?? 0] || data.dayun.currentDayun;
            const selectedLiunianIndex = data.selectedLiunianIndex ?? 0;
            const selectedLiunianYear = selectedDayunForDisplay.startYear + selectedLiunianIndex;
            const age = selectedLiunianYear - data.year + 1;
            const liuNianGanZhi = this.paipan.getYearGanZhi(selectedLiunianYear);
            displayText = `大运：${selectedDayunForDisplay.gz}。流年：${selectedLiunianYear}${liuNianGanZhi.gan}${liuNianGanZhi.zhi}年，${age}岁`;
        }

        // 起运显示 - 直接使用paipan.js计算完成的数据
        const qiyunText = `起运：${data.dayun.qyy_desc ? data.dayun.qyy_desc : ''}，${data.dayun.startAge}岁。`;
        dayunDiv.createEl('p', { text: qiyunText });
        dayunDiv.createEl('p', { text: `交运：${data.dayun.qyy_desc2 ? data.dayun.qyy_desc2 : ''}`});
        dayunDiv.createEl('p', { text: displayText });

        // 大运列表
        const dayunList = dayunDiv.createEl('div');
        dayunList.addClass('dayun-list');

        // 获取日柱天干用于计算十神
        const riZhuGan = data.bazi.gztg[2] || '甲';

        // 获取当前选中索引（-1表示小运）
        const selectedIndex = data.selectedDayunIndex ?? 0;
        const isXiaoyunSelected = data.selectedDayunIndex === -1;

        // 小运按钮 - 放在大运列表首位
        const firstDayunAge = data.dayun.allDayun[0]?.age ?? data.dayun.startAge;
        const xiaoyunAgeRange = firstDayunAge >= 1 ? `1-${firstDayunAge}` : '1';
        const xiaoyunBtn = dayunList.createEl('button', {
            cls: (isXiaoyunSelected ? 'dayun-btn is-selected' : 'dayun-btn')
        });
        const xiaoyunYearDiv = xiaoyunBtn.createEl('div');
        xiaoyunYearDiv.setText(`${data.year}`);
        xiaoyunYearDiv.addClass('dayun-year');
        const xiaoyunAgeDiv = xiaoyunBtn.createEl('div');
        xiaoyunAgeDiv.setText(xiaoyunAgeRange);
        xiaoyunAgeDiv.addClass('dayun-age');
        const xiaoyunDaDiv = xiaoyunBtn.createEl('div');
        xiaoyunDaDiv.setText('小');
        xiaoyunDaDiv.addClass('dayun-gan');
        const xiaoyunYunDiv = xiaoyunBtn.createEl('div');
        xiaoyunYunDiv.setText('运');
        xiaoyunYunDiv.addClass('dayun-zhi');

        // 点击小运时选中
        xiaoyunBtn.addEventListener('click', () => {
            if (this.onXiaoyunSelect) {
                this.onXiaoyunSelect();
            }
        });

        // 大运按钮
        data.dayun.allDayun.slice(0, 12).forEach((dy: DayunItem, index: number) => {
            const btn = dayunList.createEl('button', {
                cls: (index === selectedIndex ? 'dayun-btn is-selected' : 'dayun-btn')
            });
            // 年份
            const yearDiv = btn.createEl('div');
            yearDiv.setText(`${dy.startYear}`);
            yearDiv.addClass('dayun-year');
            // 岁数
            const ageDiv = btn.createEl('div');
            ageDiv.setText(`${dy.age}岁`);
            ageDiv.addClass('dayun-age');
            // 天干 + 十神：天干染色，十神不染色
            const ganShishen = this.paipan.getShiShen(riZhuGan, dy.gan);
            const ganWuXing = this.paipan.getGanWuXing(dy.gan);
            const ganDiv = btn.createEl('div');
            const ganSpan = ganDiv.createEl('span');
            ganSpan.setText(dy.gan);
            ganSpan.addClass('c-' + ganWuXing);
            const ganShishenSpan = ganDiv.createEl('span');
            ganShishenSpan.setText(ganShishen);
            ganDiv.addClass('dayun-gan');
            // 地支 + 十神（根据地支的主气计算）：地支染色，十神不染色
            const zhiShishen = this.paipan.getZhiShiShen(riZhuGan, dy.zhi);
            const zhiWuXing = this.paipan.getZhiWuXing(dy.zhi);
            const zhiDiv = btn.createEl('div');
            const zhiSpan = zhiDiv.createEl('span');
            zhiSpan.setText(dy.zhi);
            zhiSpan.addClass('c-' + zhiWuXing);
            const zhiShishenSpan = zhiDiv.createEl('span');
            zhiShishenSpan.setText(zhiShishen);
            zhiDiv.addClass('dayun-zhi');
            btn.addEventListener('click', () => {
                if (this.onDayunSelect) {
                    this.onDayunSelect(index);
                }
            });
        });

        // 流年列表
        this.displayLiunianList(dayunDiv, data);
    }

    // 显示流年列表
    private displayLiunianList(container: Element, data: CurrentBaziData) {
        const liunianList = container.createEl('div');
        liunianList.addClass('liunian-list');
        const selectedLiunianIndex = data.selectedLiunianIndex ?? 0;

        // 获取选中大运的年份范围，如果是小运则显示小运年份
        let dayunStartYear: number;
        let isXiaoyunMode = false;

        if (data.selectedDayunIndex === -1) {
            dayunStartYear = data.year;
            isXiaoyunMode = true;
        } else {
            const selectedDayun = data.dayun.allDayun[data.selectedDayunIndex ?? 0] || data.dayun.currentDayun;
            dayunStartYear = selectedDayun.startYear;
        }

        // 计算小运覆盖的年份数
        const firstDayunAge = data.dayun.allDayun[0]?.age ?? data.dayun.startAge;
        const xiaoyunYearCount = firstDayunAge;
        const displayYearCount = isXiaoyunMode ? Math.min(xiaoyunYearCount, 10) : 10;
        const selectedDayunForLiunian = isXiaoyunMode ? null : (data.dayun.allDayun[data.selectedDayunIndex ?? 0] || data.dayun.currentDayun);

        // 日柱天干用于计算十神
        const riZhuGan = data.bazi.gztg[2] || '甲';

        for (let i = 0; i < displayYearCount; i++) {
            const year = dayunStartYear + i;
            const liuNianGanZhi = this.paipan.getYearGanZhi(year);
            const ganShishen = this.paipan.getShiShen(riZhuGan, liuNianGanZhi.gan);
            const zhiShishen = this.paipan.getZhiShiShen(riZhuGan, liuNianGanZhi.zhi);

            const hourGan = data.bazi.gztg[3] || '';
            const hourZhi = data.bazi.dz[3] || '';
            if (!hourGan || !hourZhi) {
                console.error('时柱天干地支数据无效');
                continue;
            }
            const xiaoYunAge = isXiaoyunMode ? (i + 1) : (selectedDayunForLiunian!.age + i + 1);
            const xiaoYun = this.paipan.getXiaoYun(
                hourGan,
                hourZhi,
                data.year,
                data.gender,
                xiaoYunAge
            );
            const btn = liunianList.createEl('button', {
                cls: (i === selectedLiunianIndex ? 'liunian-btn is-selected' : 'liunian-btn')
            });
            // 年份
            const yearDiv = btn.createEl('div');
            yearDiv.setText(`${year}`);
            yearDiv.addClass('liunian-year');
            // 天干+十神
            const ganWuXing = this.paipan.getGanWuXing(liuNianGanZhi.gan);
            const ganDiv = btn.createEl('div');
            const ganSpan = ganDiv.createEl('span');
            ganSpan.setText(liuNianGanZhi.gan);
            ganSpan.addClass('c-' + ganWuXing);
            const ganShishenSpan = ganDiv.createEl('span');
            ganShishenSpan.setText(ganShishen);
            ganDiv.addClass('liunian-gan');
            // 地支+十神
            const zhiWuXing = this.paipan.getZhiWuXing(liuNianGanZhi.zhi);
            const zhiDiv = btn.createEl('div');
            const zhiSpan = zhiDiv.createEl('span');
            zhiSpan.setText(liuNianGanZhi.zhi);
            zhiSpan.addClass('c-' + zhiWuXing);
            const zhiShishenSpan = zhiDiv.createEl('span');
            zhiShishenSpan.setText(zhiShishen);
            zhiDiv.addClass('liunian-zhi');
            // 小运干支
            const xiaoYunRow = btn.createEl('div');
            xiaoYunRow.setText(`${xiaoYun.gan}${xiaoYun.zhi}`);
            xiaoYunRow.addClass('liunian-row');

            // 点击流年时选中
            btn.addEventListener('click', () => {
                const dayunIdx = isXiaoyunMode ? -1 : (data.selectedDayunIndex ?? 0);
                if (this.onLiunianSelect) {
                    this.onLiunianSelect(dayunIdx, i);
                }
            });
        }
    }

    // 获取十神关系（简短版）
    getShiShen(dayGan: string, otherGan: string): string {
        return this.paipan.getShiShen(dayGan, otherGan);
    }

    // 根据地支计算十神（根据地支的主气）
    getZhiShiShen(dayGan: string, zhi: string): string {
        return this.paipan.getZhiShiShen(dayGan, zhi);
    }

    // 获取天干的五行属性
    getGanWuXing(gan: string): string {
        return this.paipan.getGanWuXing(gan);
    }

    // 获取地支的五行属性
    getZhiWuXing(zhi: string): string {
        return this.paipan.getZhiWuXing(zhi);
    }

    // 获取小运
    getXiaoYun(hourGan: string, hourZhi: string, birthYear: number, gender: number, age: number): { gan: string; zhi: string } {
        return this.paipan.getXiaoYun(hourGan, hourZhi, birthYear, gender, age);
    }

    // 获取年份的干支
    getYearGanZhi(year: number): { gan: string, zhi: string } {
        return this.paipan.getYearGanZhi(year);
    }
}
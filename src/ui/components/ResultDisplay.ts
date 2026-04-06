// 结果展示组件 - 负责显示八字结果的时间、四柱干支、节气等信息
// 从BaziView.ts中提取的结果显示功能
import { Paipan } from '../../Paipan';
import { CurrentBaziData } from '../../models/types';

export class ResultDisplay {
    private paipan: Paipan;
    private onTimeAdjust?: (hourDelta: number) => void;

    constructor(paipan: Paipan) {
        this.paipan = paipan;
    }

    // 设置回调函数
    setCallbacks(onTimeAdjust?: (hourDelta: number) => void) {
        this.onTimeAdjust = onTimeAdjust;
    }

    // 显示结果（包含时间、四柱干支、节气等信息）
    displayResults(container: Element, data: CurrentBaziData) {
        container.empty();

        // 时间显示
        const timeDiv = container.createEl('div');
        timeDiv.addClass('bazi-time-info');
        const date = new Date(data.year, data.month - 1, data.day, data.hour, data.minute, data.second);

        // 真太阳时与公历在同一行展示
        let timeText = '';
        if (data.timeCorrectionEnabled && data.bazi.zty) {
            const zty = data.bazi.zty;
            timeText = `公历：${date.getFullYear()}年${data.month}月${data.day}日 ${String(zty.hour).padStart(2, '0')}:${String(zty.minute).padStart(2, '0')}:${String(zty.second).padStart(2, '0')}`;
            timeText += ` | UTC+8：${String(data.hour).padStart(2, '0')}:${String(data.minute).padStart(2, '0')}:${String(data.second).padStart(2, '0')}`;
        } else {
            timeText = `公历：${date.getFullYear()}年${data.month}月${data.day}日 ${String(data.hour).padStart(2, '0')}:${String(data.minute).padStart(2, '0')}:${String(data.second).padStart(2, '0')}`;
        }
        timeDiv.createEl('p', { text: timeText });

        // 获取农历信息
        const lunarDate = this.paipan.getLunarDate(data.year, data.month, data.day);
        if (lunarDate) {
            const lunarYearStr = lunarDate.isLeap ? `${lunarDate.year}年闰${lunarDate.monthName}` : `${lunarDate.year}年${lunarDate.monthName}`;
            const lunarDayStr = this.paipan.getLunarDayName(lunarDate.day);
            timeDiv.createEl('p', { text: `农历：${lunarYearStr}${lunarDayStr}` });
        } else {
            timeDiv.createEl('p', { text: `农历：计算失败` });
        }

        // 干支历与时辰调整按钮在同一行
        const gzhRow = timeDiv.createEl('div');
        gzhRow.addClass('gzh-row');
        const gzhSpan = gzhRow.createEl('span');
        gzhSpan.appendText('干支历： ');
        gzhSpan.addClass('gzh-text');

        // 年柱
        const yearGanSpan = gzhSpan.createEl('span');
        yearGanSpan.setText(data.bazi.gztg[0] || '');
        yearGanSpan.addClass('c-' + this.paipan.getGanWuXing(data.bazi.gztg[0] || ''));
        const yearZhiSpan = gzhSpan.createEl('span');
        yearZhiSpan.setText(data.bazi.dz[0] || '');
        yearZhiSpan.addClass('c-' + this.paipan.getZhiWuXing(data.bazi.dz[0] || ''));
        gzhSpan.appendText('年 ');

        // 月柱
        const monthGanSpan = gzhSpan.createEl('span');
        monthGanSpan.setText(data.bazi.gztg[1] || '');
        monthGanSpan.addClass('c-' + this.paipan.getGanWuXing(data.bazi.gztg[1] || ''));
        const monthZhiSpan = gzhSpan.createEl('span');
        monthZhiSpan.setText(data.bazi.dz[1] || '');
        monthZhiSpan.addClass('c-' + this.paipan.getZhiWuXing(data.bazi.dz[1] || ''));
        gzhSpan.appendText('月 ');

        // 日柱
        const dayGanSpan = gzhSpan.createEl('span');
        dayGanSpan.setText(data.bazi.gztg[2] || '');
        dayGanSpan.addClass('c-' + this.paipan.getGanWuXing(data.bazi.gztg[2] || ''));
        const dayZhiSpan = gzhSpan.createEl('span');
        dayZhiSpan.setText(data.bazi.dz[2] || '');
        dayZhiSpan.addClass('c-' + this.paipan.getZhiWuXing(data.bazi.dz[2] || ''));
        gzhSpan.appendText('日 ');

        // 时柱
        const hourGanSpan = gzhSpan.createEl('span');
        hourGanSpan.setText(data.bazi.gztg[3] || '');
        hourGanSpan.addClass('c-' + this.paipan.getGanWuXing(data.bazi.gztg[3] || ''));
        const hourZhiSpan = gzhSpan.createEl('span');
        hourZhiSpan.setText(data.bazi.dz[3] || '');
        hourZhiSpan.addClass('c-' + this.paipan.getZhiWuXing(data.bazi.dz[3] || ''));
        gzhSpan.appendText('时');

        // 时辰调整按钮
        const hourMinusBtn = gzhRow.createEl('button', { text: '时↑' });
        hourMinusBtn.addClass('hour-adjust-btn');
        const hourPlusBtn = gzhRow.createEl('button', { text: '时↓' });
        hourPlusBtn.addClass('hour-adjust-btn');

        // 节气信息
        if (data.solarTerms.previous && data.solarTerms.next) {
            const formatDateTime = (date: Date) => {
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`;
            };
            timeDiv.createEl('p', {
                text: `节气：${data.solarTerms.previous.name}${formatDateTime(data.solarTerms.previous.date)}-${data.solarTerms.next.name}${formatDateTime(data.solarTerms.next.date)}`
            });
        }

        // 绑定按钮事件
        if (this.onTimeAdjust) {
            hourMinusBtn.addEventListener('click', () => this.onTimeAdjust!(-1));
            hourPlusBtn.addEventListener('click', () => this.onTimeAdjust!(1));
        }
    }

    // 获取农历日期信息
    getLunarDate(year: number, month: number, day: number) {
        return this.paipan.getLunarDate(year, month, day);
    }

    // 获取农历日名称
    getLunarDayName(day: number): string {
        return this.paipan.getLunarDayName(day);
    }

    // 获取天干五行
    getGanWuXing(gan: string): string {
        return this.paipan.getGanWuXing(gan);
    }

    // 获取地支五行
    getZhiWuXing(zhi: string): string {
        return this.paipan.getZhiWuXing(zhi);
    }
}
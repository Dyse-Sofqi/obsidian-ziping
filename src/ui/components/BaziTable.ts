// 八字表格组件
// 从BaziView.ts中提取的八字表格创建功能
import { Paipan } from '../../Paipan';
import { CurrentBaziData, DayunItem } from '../../models/types';

export class BaziTable {
    private paipan: Paipan;

    constructor(paipan: Paipan) {
        this.paipan = paipan;
    }

    // 创建八字表格
    createBaziTable(container: Element, data: CurrentBaziData) {
        // 确保数据完整性
        if (!data.bazi.gztg || !data.bazi.dz || data.bazi.gztg.length < 4 || data.bazi.dz.length < 4) {
            return;
        }

        const table = container.createEl('table');
        table.addClass('bazi-table', 'ziping-table-style');

        // 判断是否是小运模式
        const isXiaoyunMode = data.selectedDayunIndex === -1;
        const selectedLiunianIndex = data.selectedLiunianIndex ?? 0;

        // 获取选中流年的年份和干支
        let liunianYear: number;
        let dayunGan: string;
        let dayunZhi: string;
        let dayunHeaderTitle: string;

        if (isXiaoyunMode) {
            liunianYear = data.year + selectedLiunianIndex;
            const age = liunianYear - data.year + 1;
            const hourGan = data.bazi.gztg[3] || '';
            const hourZhi = data.bazi.dz[3] || '';
            const xiaoYun = this.paipan.getXiaoYun(hourGan, hourZhi, data.year, data.gender, age);
            dayunGan = xiaoYun.gan;
            dayunZhi = xiaoYun.zhi;
            dayunHeaderTitle = '小运';
        } else {
            const selectedDayunIndex = data.selectedDayunIndex ?? 0;
            const selectedDayun = data.dayun.allDayun[selectedDayunIndex] || data.dayun.currentDayun;
            liunianYear = selectedDayun.startYear + selectedLiunianIndex;
            dayunGan = selectedDayun.gan;
            dayunZhi = selectedDayun.zhi;
            dayunHeaderTitle = '大运';
        }

        // 获取选中流年的干支
        const liuNianGanZhi = this.paipan.getYearGanZhi(liunianYear);
        const liuNianGan = liuNianGanZhi.gan;
        const liuNianZhi = liuNianGanZhi.zhi;

        // 四柱干支
        const pillars: Array<{ name: string, gan: string, zhi: string }> = [
            { name: '年柱', gan: data.bazi.gztg[0] || '', zhi: data.bazi.dz[0] || '' },
            { name: '月柱', gan: data.bazi.gztg[1] || '', zhi: data.bazi.dz[1] || '' },
            { name: '日柱', gan: data.bazi.gztg[2] || '', zhi: data.bazi.dz[2] || '' },
            { name: '时柱', gan: data.bazi.gztg[3] || '', zhi: data.bazi.dz[3] || '' }
        ];

        // 日柱天干作为基准计算十神
        const riZhuGan = pillars[2]!.gan;
        if (!riZhuGan) return;

        // 第一行：标题
        const headerRow = table.createEl('tr');
        const headers = ['时间', '年柱', '月柱', '日柱'];
        
        // 如果显示时柱，则添加时柱列
        if (data.showHourPillar !== false) {
            headers.push('时柱');
        }
        
        headers.push(dayunHeaderTitle, '流年');
        
        headers.forEach(title => {
            const th = headerRow.createEl('th');
            th.setText(title);
            th.addClass('ziping-table-header');
        });

        // 第二行：十神关系
        const columns: Array<{ gan: string, zhi: string, gz: string }> = [
            { gan: pillars[0]!.gan, zhi: pillars[0]!.zhi, gz: pillars[0]!.gan + pillars[0]!.zhi },
            { gan: pillars[1]!.gan, zhi: pillars[1]!.zhi, gz: pillars[1]!.gan + pillars[1]!.zhi },
            { gan: pillars[2]!.gan, zhi: pillars[2]!.zhi, gz: pillars[2]!.gan + pillars[2]!.zhi }
        ];
        
        // 如果显示时柱，则添加时柱列
        if (data.showHourPillar !== false) {
            columns.push({ gan: pillars[3]!.gan, zhi: pillars[3]!.zhi, gz: pillars[3]!.gan + pillars[3]!.zhi });
        }
        
        columns.push({ gan: dayunGan, zhi: dayunZhi, gz: dayunGan + dayunZhi });
        columns.push({ gan: liuNianGan, zhi: liuNianZhi, gz: liuNianGan + liuNianZhi });

        const genderText = data.gender === 0 ? '元男' : '元女';
        const shishenRow = table.createEl('tr');
        const shishenValues = ['十神'];
        
        // 首先处理三个固定列（年柱、月柱、日柱）
        shishenValues.push(
            this.paipan.getShiShenFull(riZhuGan, pillars[0]!.gan),
            this.paipan.getShiShenFull(riZhuGan, pillars[1]!.gan),
            genderText  // 日柱位置显示性别
        );
        
        // 如果显示时柱，添加时柱的十神
        if (data.showHourPillar !== false) {
            shishenValues.push(this.paipan.getShiShenFull(riZhuGan, pillars[3]!.gan));
        }
        
        // 大运和流年的十神（它们总是在最后两列）
        shishenValues.push(
            this.paipan.getShiShenFull(riZhuGan, dayunGan),
            this.paipan.getShiShenFull(riZhuGan, liuNianGan)
        );
        shishenValues.forEach((text, index) => {
            const td = shishenRow.createEl('td');
            td.setText(text);
            td.addClass('ziping-table-cell');
            // 为大运列添加左边框样式（大运总是在倒数第二列）
            if (index === shishenValues.length - 2) {
                td.addClass('ziping-border-left');
            }
        });

        // 后续数据行
        const getCangQiWithShiShen = (c: { gan: string, zhi: string }, type: 'main' | 'middle' | 'residual'): { gan: string, shishen: string, wuxing: string } => {
            const cangQi = this.paipan.getCangQi(c.zhi);
            const gan = type === 'main' ? cangQi.main : type === 'middle' ? cangQi.middle : cangQi.residual;
            if (!gan) return { gan: '', shishen: '', wuxing: '' };
            const shishen = this.paipan.getShiShenFull(riZhuGan, gan);
            const wuxing = this.paipan.getGanWuXing(gan);
            return { gan, shishen, wuxing };
        };

        const rowConfig: Array<{
            label: string;
            values: Array<{ gan?: string, shishen?: string, wuxing?: string, text?: string }>;
            isCangQi?: boolean;
            isXunKong?: boolean;
        }> = [
                { label: '天干', values: columns.map(c => ({ text: c.gan, wuxing: this.paipan.getGanWuXing(c.gan) })) },
                { label: '地支', values: columns.map(c => ({ text: c.zhi, wuxing: this.paipan.getZhiWuXing(c.zhi) })) },
                { label: '人元', values: columns.map(c => getCangQiWithShiShen(c, 'main')), isCangQi: true },
                { label: '', values: columns.map(c => getCangQiWithShiShen(c, 'middle')), isCangQi: true },
                { label: '', values: columns.map(c => getCangQiWithShiShen(c, 'residual')), isCangQi: true },
                { label: '纳音', values: columns.map(c => ({ text: this.paipan.getNaYin(c.gz) })) },
                { label: '星运', values: columns.map(c => ({ text: this.paipan.getXingYun(riZhuGan, c.zhi) })) },
                { label: '自坐', values: columns.map(c => ({ text: this.paipan.getZiZuo(c.gan, c.zhi) })) },
                { label: '空亡', values: columns.map(c => ({ text: this.paipan.getXunKong(c.gz) })), isXunKong: true }
            ];

        rowConfig.forEach(rowData => {
            const row = table.createEl('tr');
            const first = row.createEl('td');
            first.setText(rowData.label);
            first.addClass('ziping-table-cell-bold');
            rowData.values.forEach((val, idx) => {
                const td = row.createEl('td');
                td.addClass('ziping-table-cell');
                
                // 为大运列添加左边框样式（大运总是在倒数第二列）
                if (idx === rowData.values.length - 2) {
                    td.addClass('ziping-border-left');
                }

                if (rowData.isCangQi) {
                    if (val.gan) {
                        const ganSpan = td.createEl('span');
                        ganSpan.setText(val.gan);
                        if (val.wuxing) {
                            ganSpan.addClass('c-' + val.wuxing);
                            ganSpan.addClass('ziping-font-weight-600');
                        }
                    }
                    if (val.shishen) {
                        const shishenSpan = td.createEl('span');
                        shishenSpan.setText(val.shishen);
                    }
                } else if (rowData.isXunKong) {
                    td.setText(val.text || '');
                    if (idx === 2) {
                        td.addClass('ziping-font-bold');
                    }
                } else {
                    td.setText(val.text || '');
                    if (val.wuxing) {
                        td.addClass('c-' + val.wuxing);
                    }
                }
            });
        });
    }

    // 获取五行颜色类名
    getWuXingColorClass(wuxing: string): string {
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

    // 获取天干五行
    getGanWuXing(gan: string): string {
        return this.paipan.getGanWuXing(gan);
    }

    // 获取地支五行
    getZhiWuXing(zhi: string): string {
        return this.paipan.getZhiWuXing(zhi);
    }

    // 获取十神关系（完整版）
    getShiShenFull(dayGan: string, otherGan: string): string {
        return this.paipan.getShiShenFull(dayGan, otherGan);
    }

    // 获取藏干
    getCangQi(zhi: string): { main: string; middle: string; residual: string } {
        return this.paipan.getCangQi(zhi);
    }

    // 获取纳音
    getNaYin(ganZhi: string): string {
        return this.paipan.getNaYin(ganZhi);
    }

    // 获取星运（十二长生状态）
    getXingYun(dayGan: string, zhi: string): string {
        return this.paipan.getXingYun(dayGan, zhi);
    }

    // 获取自坐（天干对地支的十二长生状态）
    getZiZuo(gan: string, zhi: string): string {
        return this.paipan.getZiZuo(gan, zhi);
    }

    // 获取空亡
    getXunKong(ganZhi: string): string {
        return this.paipan.getXunKong(ganZhi);
    }

    // 获取年份的干支
    getYearGanZhi(year: number): { gan: string, zhi: string } {
        return this.paipan.getYearGanZhi(year);
    }

    // 获取小运
    getXiaoYun(hourGan: string, hourZhi: string, birthYear: number, gender: number, age: number): { gan: string; zhi: string } {
        return this.paipan.getXiaoYun(hourGan, hourZhi, birthYear, gender, age);
    }
}
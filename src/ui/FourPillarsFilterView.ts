// 四柱筛选视图组件
// 从TimeSettingModal.ts中提取的四柱干支筛选功能
import { Paipan } from '../Paipan';
import { Modal, App } from 'obsidian';

export interface FilterResult {
    year: number;
    month: number;
    day: number;
    hour: number;
}

export class FourPillarsFilterView {
    private paipan: Paipan;
    private container: Element;
    private onResultSelected?: (result: FilterResult) => void;
    
    // 用户选择的四柱干支
    private selectedYearGan: string = '';
    private selectedYearZhi: string = '';
    private selectedMonthGan: string = '';
    private selectedMonthZhi: string = '';
    private selectedDayGan: string = '';
    private selectedDayZhi: string = '';
    private selectedHourGan: string = '';
    private selectedHourZhi: string = '';
    private isLateZi: boolean = false;

    constructor(paipan: Paipan, container: Element) {
        this.paipan = paipan;
        this.container = container;
    }

    // 设置回调函数
    setCallback(onResultSelected?: (result: FilterResult) => void) {
        this.onResultSelected = onResultSelected;
    }

    // 渲染筛选界面
    render() {
        this.container.empty();
        this.renderBaziTab(this.container);
    }

    // 渲染四柱筛选选项卡
    private renderBaziTab(container: Element) {
        // 获取当前公历时间
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const hour = now.getHours();

        // 调用paipan.js中的方法计算干支
        const baziResult = this.paipan.fatemaps(0, year, month, day, hour, 0, 0);
        // gztg是天干数组，dz是地支数组
        const bazi = {
            yearGan: baziResult.gztg[0],
            monthGan: baziResult.gztg[1],
            dayGan: baziResult.gztg[2],
            hourGan: baziResult.gztg[3],
            yearZhi: baziResult.dz[0],
            monthZhi: baziResult.dz[1],
            dayZhi: baziResult.dz[2],
            hourZhi: baziResult.dz[3]
        };

        // 天干列表
        const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
        // 地支列表
        const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
        // 阳干
        const yangGan = ['甲', '丙', '戊', '庚', '壬'];
        // 阴干
        const yinGan = ['乙', '丁', '己', '辛', '癸'];
        // 阳支
        const yangZhi = ['子', '寅', '辰', '午', '申', '戌'];
        // 阴支
        const yinZhi = ['丑', '卯', '巳', '未', '酉', '亥'];

        // 第一排：天干下拉列表
        const ganRow = container.createEl('div');
        ganRow.setCssProps({ display: 'flex', gap: '10px', marginBottom: '10px' });

        // 年柱天干
        const yearGanSelect = ganRow.createEl('select');
        ganList.forEach(gan => {
            yearGanSelect.createEl('option', { text: gan, value: gan });
        });
        // 设置年干的默认值为计算值
        if (bazi?.yearGan) {
            yearGanSelect.value = bazi.yearGan;
        }

        // 月柱天干（不可选，由年干和月支自动计算）
        const monthGanSelect = ganRow.createEl('select');
        monthGanSelect.disabled = true; // 设置为不可选
        // 添加所有天干选项
        ganList.forEach(gan => {
            monthGanSelect.createEl('option', { text: gan, value: gan });
        });

        // 日柱天干
        const dayGanSelect = ganRow.createEl('select');
        ganList.forEach(gan => {
            dayGanSelect.createEl('option', { text: gan, value: gan });
        });
        // 设置日干的默认值为计算值
        if (bazi?.dayGan) {
            dayGanSelect.value = bazi.dayGan;
        }

        // 时柱天干（不可选，由日干和时支自动计算）
        const hourGanSelect = ganRow.createEl('select');
        hourGanSelect.disabled = true; // 设置为不可选
        // 添加所有天干选项
        ganList.forEach(gan => {
            hourGanSelect.createEl('option', { text: gan, value: gan });
        });

        // 第二排：地支下拉列表
        const zhiRow = container.createEl('div');
        zhiRow.setCssProps({ display: 'flex', gap: '10px' });

        // 年柱地支
        const yearZhiSelect = zhiRow.createEl('select');
        const updateYearZhiOptions = () => {
            const selectedGan = yearGanSelect.value;
            yearZhiSelect.innerHTML = '';
            const zhiOptions = yangGan.includes(selectedGan) ? yangZhi : yinZhi;
            zhiOptions.forEach(zhi => {
                yearZhiSelect.createEl('option', { text: zhi, value: zhi });
            });
        };
        yearGanSelect.addEventListener('change', updateYearZhiOptions);
        updateYearZhiOptions(); // 初始化年柱地支选项
        // 设置年支的默认值为计算值
        if (bazi?.yearZhi) {
            yearZhiSelect.value = bazi.yearZhi;
        }

        // 月柱地支
        const monthZhiSelect = zhiRow.createEl('select');
        // 五虎遁：根据年干和月支确定月干
        const updateMonthGanByYear = () => {
            const yearGan = yearGanSelect.value;
            const monthZhi = monthZhiSelect.value;

            // 五虎遁口诀：甲己之年丙作首，乙庚之岁戊为头，丙辛之岁寻庚上，丁壬壬寅顺水流，若问戊癸何方发，甲寅之上好追求。
            // 寅月的月干：甲己->丙，乙庚->戊，丙辛->庚，丁壬->壬，戊癸->甲
            const yinMonthGan: { [key: string]: string } = {
                '甲': '丙',
                '己': '丙',
                '乙': '戊',
                '庚': '戊',
                '丙': '庚',
                '辛': '庚',
                '丁': '壬',
                '壬': '壬',
                '戊': '甲',
                '癸': '甲'
            };

            // 地支顺序：子丑寅卯辰巳午未申酉戌亥
            const zhiOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
            const monthIndex = zhiOrder.indexOf(monthZhi);
            const yinIndex = zhiOrder.indexOf('寅');

            // 计算月干：从寅月开始，每过一个月，月干向后推一位
            const yinGan = yinMonthGan[yearGan];
            if (!yinGan) return; // 如果找不到对应的寅月天干，则不更新
            const ganOrder = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
            const yinGanIndex = ganOrder.indexOf(yinGan);
            // 计算从寅月到当前月的偏移量
            let monthOffset = monthIndex - yinIndex;
            if (monthOffset < 0) {
                monthOffset += 12; // 处理跨年情况
            }
            const monthGanIndex = (yinGanIndex + monthOffset) % 10;
            const monthGan = ganOrder[monthGanIndex];

            // 设置月干的选中值
            if (monthGan) {
                monthGanSelect.value = monthGan;
            }
        };

        // 初始化月支选项
        zhiList.forEach(zhi => {
            monthZhiSelect.createEl('option', { text: zhi, value: zhi });
        });
        // 设置月支的默认值为计算值
        if (bazi?.monthZhi) {
            monthZhiSelect.value = bazi.monthZhi;
        }

        // 添加事件监听
        yearGanSelect.addEventListener('change', updateMonthGanByYear);
        monthZhiSelect.addEventListener('change', updateMonthGanByYear);

        // 初始化月干
        updateMonthGanByYear();

        // 日柱地支
        const dayZhiSelect = zhiRow.createEl('select');
        const updateDayZhiOptions = () => {
            const selectedGan = dayGanSelect.value;
            dayZhiSelect.innerHTML = '';
            const zhiOptions = yangGan.includes(selectedGan) ? yangZhi : yinZhi;
            zhiOptions.forEach(zhi => {
                dayZhiSelect.createEl('option', { text: zhi, value: zhi });
            });
        };
        dayGanSelect.addEventListener('change', updateDayZhiOptions);
        updateDayZhiOptions(); // 初始化日柱地支选项
        // 设置日支的默认值为计算值
        if (bazi?.dayZhi) {
            dayZhiSelect.value = bazi.dayZhi;
        }

        // 时柱地支
        const hourZhiSelect = zhiRow.createEl('select');
        zhiList.forEach(zhi => {
            hourZhiSelect.createEl('option', { text: zhi, value: zhi });
        });
        // 添加晚子时选项（23:00-24:00）
        hourZhiSelect.createEl('option', { text: '子', value: '晚子时' });
        // 设置时支的默认值为计算值
        if (bazi?.hourZhi) {
            hourZhiSelect.value = bazi.hourZhi;
        }

        // 五鼠遁：根据日干和时支确定时干
        const updateHourGanByDay = () => {
            const dayGan = dayGanSelect.value;
            const hourZhi = hourZhiSelect.value;

            // 五鼠遁口诀：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途。
            // 子时的时干：甲己->甲，乙庚->丙，丙辛->戊，丁壬->庚，戊癸->壬
            const ziHourGan: { [key: string]: string } = {
                '甲': '甲',
                '己': '甲',
                '乙': '丙',
                '庚': '丙',
                '丙': '戊',
                '辛': '戊',
                '丁': '庚',
                '壬': '庚',
                '戊': '壬',
                '癸': '壬'
            };

            // 地支顺序：子丑寅卯辰巳午未申酉戌亥
            const zhiOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

            let hourGan: string = '';

            if (hourZhi === '晚子时') {
                // 晚子时（23:00-24:00）：日柱前移一柱，时干使用下一个日干的子时天干
                const ganOrder = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
                const dayGanIndex = ganOrder.indexOf(dayGan);
                if (dayGanIndex !== -1) {
                    const nextDayGan = ganOrder[(dayGanIndex + 1) % 10]; // 下一个日干
                    if (nextDayGan) {
                        const nextZiGan = ziHourGan[nextDayGan];
                        if (nextZiGan) {
                            hourGan = nextZiGan; // 使用下一个日干的子时天干
                        }
                    }
                }
            } else {
                const hourIndex = zhiOrder.indexOf(hourZhi);
                const ziIndex = zhiOrder.indexOf('子');

                // 计算时干：从子时开始，每过一个时辰，时干向后推一位
                const ziGan = ziHourGan[dayGan];
                if (!ziGan) return; // 如果找不到对应的子时天干，则不更新
                const ganOrder = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
                const ziGanIndex = ganOrder.indexOf(ziGan);
                const hourGanIndex = (ziGanIndex + hourIndex - ziIndex + 10) % 10;
                const calculatedHourGan = ganOrder[hourGanIndex];
                if (calculatedHourGan) {
                    hourGan = calculatedHourGan;
                }
            }

            // 设置时干的选中值
            if (hourGan) {
                hourGanSelect.value = hourGan;
            }
        };

        // 添加事件监听
        dayGanSelect.addEventListener('change', updateHourGanByDay);
        hourZhiSelect.addEventListener('change', updateHourGanByDay);

        // 初始化时干
        updateHourGanByDay();

        // 添加筛选按钮
        const filterButton = container.createEl('button', {
            text: '筛选匹配干支历的时间',
            cls: 'mod-cta'
        });
        filterButton.setCssProps({ marginTop: '20px', marginBottom: '10px' });

        // 创建结果展示区域
        const resultContainer = container.createEl('div', {
            cls: 'bazi-filter-result'
        });
        resultContainer.setCssProps({
            marginTop: '5px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            maxHeight: '300px',
            overflowY: 'auto'
        });

        // 筛选按钮点击事件
        filterButton.addEventListener('click', () => {
            // 获取用户选择的四柱干支
            this.selectedYearGan = yearGanSelect.value;
            this.selectedYearZhi = yearZhiSelect.value;
            this.selectedMonthGan = monthGanSelect.value;
            this.selectedMonthZhi = monthZhiSelect.value;
            this.selectedDayGan = dayGanSelect.value;
            this.selectedDayZhi = dayZhiSelect.value;
            this.selectedHourGan = hourGanSelect.value;
            this.selectedHourZhi = hourZhiSelect.value;
            this.isLateZi = this.selectedHourZhi === '晚子时';
            const actualHourZhi = this.isLateZi ? '子' : this.selectedHourZhi;

            // 清空结果区域
            resultContainer.empty();
            resultContainer.createEl('p', { text: '正在筛选...' });

            // 使用setTimeout避免阻塞UI
            setTimeout(() => {
                try {
                    // 调用筛选方法
                    const results = this.paipan.filterBaziByFourPillars(
                        this.selectedYearGan, this.selectedYearZhi,
                        this.selectedMonthGan, this.selectedMonthZhi,
                        this.selectedDayGan, this.selectedDayZhi,
                        this.selectedHourGan, actualHourZhi,
                        this.isLateZi
                    );

                    // 清空结果区域
                    resultContainer.empty();

                    // 显示筛选结果
                    if (results.length === 0) {
                        resultContainer.createEl('p', { text: '未找到符合条件的日期' });
                    } else {
                        // 创建结果列表
                        const resultList = resultContainer.createEl('ul');
                        resultList.setCssProps({
                            listStyleType: 'none',
                            padding: '0',
                            margin: '0'
                        });

                        // 添加每个结果
                        results.forEach(result => {
                            const listItem = resultList.createEl('li');
                            listItem.setCssProps({
                                padding: '8px 0',
                                borderBottom: '1px solid #eee'
                            });

                            // 格式化日期时间为YYYY.MM.DD-HH.00
                            const formattedDate = `${String(result.year).padStart(4, '0')}.${String(result.month).padStart(2, '0')}.${String(result.day).padStart(2, '0')}-${String(result.hour).padStart(2, '0')}.00`;
                            listItem.setText(formattedDate);

                            // 添加点击事件，点击后回调
                            listItem.addEventListener('click', () => {
                                // 存储选中的时间值
                                const selectedResult: FilterResult = {
                                    year: result.year,
                                    month: result.month,
                                    day: result.day,
                                    hour: result.hour
                                };

                                // 更新UI显示
                                const formattedDate = `${String(result.year).padStart(4, '0')}.${String(result.month).padStart(2, '0')}.${String(result.day).padStart(2, '0')}-${String(result.hour).padStart(2, '0')}.00`;
                                listItem.setText(`已选中: ${formattedDate}`);

                                // 调用回调函数
                                if (this.onResultSelected) {
                                    this.onResultSelected(selectedResult);
                                }
                            });

                            // 添加悬停效果
                            listItem.setCssProps({
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            });

                            listItem.addEventListener('mouseenter', () => {
                                listItem.setCssProps({ backgroundColor: '#f0f0f0' });
                            });

                            listItem.addEventListener('mouseleave', () => {
                                listItem.setCssProps({ backgroundColor: '' });
                            });
                        });
                    }
                } catch (error) {
                    resultContainer.empty();
                    resultContainer.createEl('p', {
                        text: `筛选出错: ${(error as Error).message}`,
                        cls: 'error-message'
                    });
                }
            }, 100);
        });
    }

    // 获取当前选中的四柱干支
    getSelectedPillars(): {
        yearGan: string; yearZhi: string;
        monthGan: string; monthZhi: string;
        dayGan: string; dayZhi: string;
        hourGan: string; hourZhi: string;
        isLateZi: boolean;
    } {
        return {
            yearGan: this.selectedYearGan,
            yearZhi: this.selectedYearZhi,
            monthGan: this.selectedMonthGan,
            monthZhi: this.selectedMonthZhi,
            dayGan: this.selectedDayGan,
            dayZhi: this.selectedDayZhi,
            hourGan: this.selectedHourGan,
            hourZhi: this.selectedHourZhi,
            isLateZi: this.isLateZi
        };
    }

    // 设置选中的四柱干支
    setSelectedPillars(pillars: {
        yearGan: string; yearZhi: string;
        monthGan: string; monthZhi: string;
        dayGan: string; dayZhi: string;
        hourGan: string; hourZhi: string;
        isLateZi: boolean;
    }) {
        this.selectedYearGan = pillars.yearGan;
        this.selectedYearZhi = pillars.yearZhi;
        this.selectedMonthGan = pillars.monthGan;
        this.selectedMonthZhi = pillars.monthZhi;
        this.selectedDayGan = pillars.dayGan;
        this.selectedDayZhi = pillars.dayZhi;
        this.selectedHourGan = pillars.hourGan;
        this.selectedHourZhi = pillars.hourZhi;
        this.isLateZi = pillars.isLateZi;
    }
}
import { ItemView, WorkspaceLeaf, Modal, Notice, App } from 'obsidian';
import { Paipan, BaziResult, CurrentDayunData, NearbySolarTerms, DayunItem } from './Paipan';
import { CITIES, PROVINCE_CITY_GROUPS } from './settings';
import ZipingPlugin from './main';

interface CurrentBaziData {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	gender: number;
	bazi: BaziResult;
	solarTerms: NearbySolarTerms;
	dayun: CurrentDayunData;
	selectedDayunIndex?: number;
	selectedLiunianIndex?: number;
}

export const PAIPAN_VIEW_TYPE = "paipan-view";

export class BaziView extends ItemView {
	plugin: ZipingPlugin;
	paipan: Paipan;
	currentData: CurrentBaziData | null;

	constructor(leaf: WorkspaceLeaf, plugin: ZipingPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.paipan = new Paipan();
		this.paipan.J = parseFloat(plugin.settings.longitude);
		this.paipan.W = parseFloat(plugin.settings.latitude);
		this.currentData = null;
	}

	getViewType() {
		return PAIPAN_VIEW_TYPE;
	}

	getDisplayText() {
		return "八字排盘";
	}

	getIcon() {
		return "calendar";
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		if (container) {
			container.empty();
			this.renderContent(container);
		}

		// 自动加载当前时间
		this.loadCurrentTime();
	}

	renderContent(container: HTMLElement) {
		// 设置时间按钮
		const setTimeBtn = container.createEl('button', { text: '设置时间' });
		setTimeBtn.addEventListener('click', () => {
			new TimeSettingModal(this.app, this).open();
		});

		// 结果显示区域
		this.createResultArea(container);

		// 时间调整按钮
		const timeAdjustContainer = container.createEl('div');
		timeAdjustContainer.addClass('time-adjust-container');

		// 第一排按钮（往前减）
		const row1 = timeAdjustContainer.createEl('div');
		row1.addClass('time-adjust-row');
		const yearMinusBtn = row1.createEl('button', { text: '年↑' });
		const monthMinusBtn = row1.createEl('button', { text: '月↑' });
		const dayMinusBtn = row1.createEl('button', { text: '日↑' });
		const hourMinusBtn = row1.createEl('button', { text: '时↑' });

		// 第二排按钮（往后加）
		const row2 = timeAdjustContainer.createEl('div');
		row2.addClass('time-adjust-row');
		const yearPlusBtn = row2.createEl('button', { text: '年↓' });
		const monthPlusBtn = row2.createEl('button', { text: '月↓' });
		const dayPlusBtn = row2.createEl('button', { text: '日↓' });
		const hourPlusBtn = row2.createEl('button', { text: '时↓' });

		// 时间调整函数
		const adjustTime = (yearDelta: number, monthDelta: number, dayDelta: number, hourDelta: number) => {
			if (!this.currentData) {
				new Notice('请先设置时间');
				return;
			}
			// 使用Date对象处理日期进位/退位
			const date = new Date(
				this.currentData.year,
				this.currentData.month - 1,
				this.currentData.day,
				this.currentData.hour,
				this.currentData.minute,
				this.currentData.second
			);
			date.setFullYear(date.getFullYear() + yearDelta);
			date.setMonth(date.getMonth() + monthDelta);
			date.setDate(date.getDate() + dayDelta);
			date.setHours(date.getHours() + hourDelta);

			this.calculateAndDisplay(
				date.getFullYear(),
				date.getMonth() + 1,
				date.getDate(),
				date.getHours(),
				date.getMinutes(),
				date.getSeconds(),
				this.currentData.gender
			);
		};

		// 绑定按钮事件
		yearMinusBtn.addEventListener('click', () => adjustTime(-1, 0, 0, 0));
		monthMinusBtn.addEventListener('click', () => adjustTime(0, -1, 0, 0));
		dayMinusBtn.addEventListener('click', () => adjustTime(0, 0, -1, 0));
		hourMinusBtn.addEventListener('click', () => adjustTime(0, 0, 0, -1));
		yearPlusBtn.addEventListener('click', () => adjustTime(1, 0, 0, 0));
		monthPlusBtn.addEventListener('click', () => adjustTime(0, 1, 0, 0));
		dayPlusBtn.addEventListener('click', () => adjustTime(0, 0, 1, 0));
		hourPlusBtn.addEventListener('click', () => adjustTime(0, 0, 0, 1));

		// 回到现在按钮
		const currentTimeBtn = container.createEl('button', { text: '回到现在' });
		currentTimeBtn.style.marginTop = '20px';
		currentTimeBtn.addEventListener('click', () => {
			this.loadCurrentTime();
		});

		// 保存按钮
		const saveBtn = container.createEl('button', { text: '保存案例' });
		saveBtn.style.marginTop = '20px';
		saveBtn.addEventListener('click', () => {
			this.saveCase();
		});
	}



	loadCurrentTime() {
		const now = new Date();
		this.calculateAndDisplay(
			now.getFullYear(),
			now.getMonth() + 1,
			now.getDate(),
			now.getHours(),
			now.getMinutes(),
			now.getSeconds(),
			0 // 默认男
		);
	}

	createResultArea(container: HTMLElement) {
		const resultContainer = container.createEl('div');
		resultContainer.id = 'bazi-result';
		resultContainer.setCssProps({
			marginTop: '20px',
			padding: '10px',
			border: '1px solid #ccc',
			minHeight: '200px',
			maxHeight: '400px',
			overflow: 'auto',
			width: 'fit-content'
		});
	}

	calculateAndDisplay(year: number, month: number, day: number, hour: number, minute: number, second: number, gender: number) {
		try {
			const bazi = this.paipan.fatemaps(gender, year, month, day, hour, minute, second);
			const solarTerms = this.paipan.getNearbySolarTerms(year, month, day);
			const dayunData = this.paipan.getCurrentDayun(year, month, day, gender);

			// 找到当前流年对应的大运索引作为默认选中
			const currentYear = new Date().getFullYear();
			let defaultDayunIndex = 0;
			let defaultLiunianIndex = 0;
			const dayunItems = dayunData.allDayun.slice(0, 12);
			const firstDayunStartYear = dayunItems[0]?.startYear ?? currentYear;

			// 如果当前年份在第一步大运之前，选中小运
			if (currentYear < firstDayunStartYear) {
				defaultDayunIndex = -1;
				defaultLiunianIndex = currentYear - year;
			} else {
				// 查找当前年份对应的大运
				for (let i = 0; i < dayunItems.length; i++) {
					const dy = dayunItems[i];
					if (!dy) continue;
					const nextDy = dayunItems[i + 1];
					if (dy.startYear <= currentYear) {
						if (!nextDy || currentYear < nextDy.startYear) {
							defaultDayunIndex = i;
							// 计算当前年份在选中大运中的位置（0-9）
							defaultLiunianIndex = currentYear - dy.startYear;
							break;
						}
					}
				}
			}

			this.currentData = {
				year, month, day, hour, minute, second, gender,
				bazi,
				solarTerms,
				dayun: dayunData,
				selectedDayunIndex: defaultDayunIndex,
				selectedLiunianIndex: defaultLiunianIndex
			};

			this.displayResults();
		} catch (error) {
			new Notice('计算出错: ' + (error as Error).message);
		}
	}

	displayResults() {
		const resultContainer = this.containerEl.querySelector('#bazi-result');
		if (!resultContainer || !this.currentData) return;

		resultContainer.empty();

		const data = this.currentData;

		// 时间显示
		const timeDiv = resultContainer.createEl('div');
		const date = new Date(data.year, data.month - 1, data.day, data.hour, data.minute, data.second);
		timeDiv.createEl('p', { text: `公历: ${date.getFullYear()}年${data.month}月${data.day}日 ${String(data.hour).padStart(2, '0')}:${String(data.minute).padStart(2, '0')}:${String(data.second).padStart(2, '0')}` });

		// 真太阳时显示
		if (data.bazi.zty) {
			const zty = data.bazi.zty;
			const cityName = this.plugin.settings.city || '';
			timeDiv.createEl('p', {
				text: `真太阳时 (${cityName}): ${String(zty.hour).padStart(2, '0')}:${String(zty.minute).padStart(2, '0')}:${String(zty.second).padStart(2, '0')}`
			});
		}

		// 获取农历信息
		const lunarDate = this.paipan.getLunarDate(data.year, data.month, data.day);
		if (lunarDate) {
			const lunarYearStr = lunarDate.isLeap ? `${lunarDate.year}年闰${lunarDate.monthName}` : `${lunarDate.year}年${lunarDate.monthName}`;
			const lunarDayStr = this.paipan.getLunarDayName(lunarDate.day);
			timeDiv.createEl('p', { text: `农历: ${lunarYearStr}${lunarDayStr}` });
		} else {
			timeDiv.createEl('p', { text: `农历: [计算失败]` });
		}

		timeDiv.createEl('p', { text: `干支历: ${data.bazi.gztg[0]}${data.bazi.dz[0]}年 ${data.bazi.gztg[1]}${data.bazi.dz[1]}月 ${data.bazi.gztg[2]}${data.bazi.dz[2]}日 ${data.bazi.gztg[3]}${data.bazi.dz[3]}时` });

		// 节气信息
    if (data.solarTerms.previous && data.solarTerms.next) {
        const solarDiv = resultContainer.createEl('div');
        const now = new Date();
        const timeToNext = Math.floor((data.solarTerms.next.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const formatDateTime = (date: Date) => {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`;
        };
        solarDiv.createEl('p', {
            text: `节气：${data.solarTerms.previous.name} (${formatDateTime(data.solarTerms.previous.date)})-${data.solarTerms.next.name} (${formatDateTime(data.solarTerms.next.date)})-距离${timeToNext}天`
        });
    }

		// 干支四柱表格
		this.createBaziTable(resultContainer, data);
		
		// 大运信息
		const dayunDiv = resultContainer.createEl('div');
		dayunDiv.createEl('p', { text: `起运时间: ${data.dayun.startAge}岁` });

		// 当前大运和流年 - 显示选中的大运或小运和流年
		let displayText = '';
		if (data.selectedDayunIndex === -1) {
			// 小运模式
			const xiaoyunYear = data.year + (data.selectedLiunianIndex ?? 0);
			displayText = `当前小运 (流年: ${xiaoyunYear}年)`;
		} else {
			const selectedDayunForDisplay = data.dayun.allDayun[data.selectedDayunIndex ?? 0] || data.dayun.currentDayun;
			const selectedLiunianIndex = data.selectedLiunianIndex ?? 0;
			const selectedLiunianYear = selectedDayunForDisplay.startYear + selectedLiunianIndex;
			displayText = `当前大运: ${selectedDayunForDisplay.age}岁 - ${selectedDayunForDisplay.gz} (流年: ${selectedLiunianYear}年)`;
		}
		dayunDiv.createEl('p', { text: displayText });

		// 获取日柱天干用于计算十神
		const riZhuGan = data.bazi.gztg[2] || '甲';

		// 大运列表
		const dayunList = dayunDiv.createEl('div');
		dayunList.addClass('dayun-list');

		// 获取当前选中索引（-1表示小运）
		const selectedIndex = data.selectedDayunIndex ?? 0;
		const isXiaoyunSelected = data.selectedDayunIndex === -1;

		// 小运按钮 - 放在大运列表首位
		const firstDayunAge = data.dayun.allDayun[0]?.age ?? data.dayun.startAge;
		const xiaoyunAgeRange = firstDayunAge >= 1 ? `1-${firstDayunAge}` : '1';
		const xiaoyunBtn = dayunList.createEl('button', {
			cls: (isXiaoyunSelected ? 'dayun-btn is-selected' : 'dayun-btn')
		});
		// 第一行：出生年份
		const xiaoyunYearDiv = xiaoyunBtn.createEl('div');
		xiaoyunYearDiv.setText(`${data.year}`);
		xiaoyunYearDiv.addClass('dayun-year');
		// 第二行：岁数范围
		const xiaoyunAgeDiv = xiaoyunBtn.createEl('div');
		xiaoyunAgeDiv.setText(xiaoyunAgeRange);
		xiaoyunAgeDiv.addClass('dayun-age');
		// 第三行：小运显示"小"
		const xiaoyunDaDiv = xiaoyunBtn.createEl('div');
		xiaoyunDaDiv.setText('小');
		xiaoyunDaDiv.addClass('dayun-gan');
		// 第四行：运
		const xiaoyunYunDiv = xiaoyunBtn.createEl('div');
		xiaoyunYunDiv.setText('运');
		xiaoyunYunDiv.addClass('dayun-zhi');

		// 点击小运时选中
		xiaoyunBtn.addEventListener('click', () => {
			this.selectXiaoyun();
		});

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
				this.selectDayun(index);
			});
		});

		// 流年列表 - 根据当前选中大运或小运展示
		const liunianList = dayunDiv.createEl('div');
		liunianList.addClass('liunian-list');

		// 获取当前选中的流年索引
		const selectedLiunianIndex = data.selectedLiunianIndex ?? 0;

		// 获取选中大运的年份范围，如果是小运则显示小运年份
		let dayunStartYear: number;
		let isXiaoyunMode = false;

		if (isXiaoyunSelected) {
			// 小运：显示从出生年到第一步大运前一年
			dayunStartYear = data.year;
			isXiaoyunMode = true;
		} else {
			const selectedDayun = data.dayun.allDayun[selectedIndex] || data.dayun.currentDayun;
			dayunStartYear = selectedDayun.startYear;
		}

		// 计算小运覆盖的年份数（第一步大运的岁数）
		const xiaoyunYearCount = firstDayunAge;
		// 显示的流年数量：小运模式显示实际年份数，最多10年
		const displayYearCount = isXiaoyunMode ? Math.min(xiaoyunYearCount, 10) : 10;

		for (let i = 0; i < displayYearCount; i++) {
			const year = dayunStartYear + i;
			const liuNianGanZhi = this.paipan.getYearGanZhi(year);
			const ganShishen = this.paipan.getShiShen(riZhuGan, liuNianGanZhi.gan);
			const zhiShishen = this.paipan.getZhiShiShen(riZhuGan, liuNianGanZhi.zhi);

			const btn = liunianList.createEl('button', {
				cls: (i === selectedLiunianIndex ? 'liunian-btn is-selected' : 'liunian-btn')
			});
			// 第一行：年份
			const yearDiv = btn.createEl('div');
			yearDiv.setText(`${year}`);
			yearDiv.addClass('liunian-year');
			// 第二行：天干+十神：天干染色，十神不染色
			const ganWuXing = this.paipan.getGanWuXing(liuNianGanZhi.gan);
			const ganDiv = btn.createEl('div');
			const ganSpan = ganDiv.createEl('span');
			ganSpan.setText(liuNianGanZhi.gan);
			ganSpan.addClass('c-' + ganWuXing);
			const ganShishenSpan = ganDiv.createEl('span');
			ganShishenSpan.setText(ganShishen);
			ganDiv.addClass('liunian-gan');
			// 第三行：地支+十神：地支染色，十神不染色
			const zhiWuXing = this.paipan.getZhiWuXing(liuNianGanZhi.zhi);
			const zhiDiv = btn.createEl('div');
			const zhiSpan = zhiDiv.createEl('span');
			zhiSpan.setText(liuNianGanZhi.zhi);
			zhiSpan.addClass('c-' + zhiWuXing);
			const zhiShishenSpan = zhiDiv.createEl('span');
			zhiShishenSpan.setText(zhiShishen);
			zhiDiv.addClass('liunian-zhi');

			// 点击流年时选中该流年及其所属大运，小运模式下使用-1作为大运索引
			btn.addEventListener('click', () => {
				const dayunIdx = isXiaoyunMode ? -1 : selectedIndex;
				this.selectLiunian(dayunIdx, i);
			});
		}
	}

	createBaziTable(container: Element, data: CurrentBaziData) {
		// 确保数据完整性
		if (!data.bazi.gztg || !data.bazi.dz || data.bazi.gztg.length < 4 || data.bazi.dz.length < 4) {
			return;
		}

		const table = container.createEl('table');
		table.setCssProps({
			width: '100%',
			borderCollapse: 'collapse',
			marginTop: '20px'
		});

		// 获取选中大运的年份范围和选中流年
		const selectedDayunIndex = data.selectedDayunIndex ?? 0;
		const selectedDayun = data.dayun.allDayun[selectedDayunIndex] || data.dayun.currentDayun;
		const dayunStartYear = selectedDayun.startYear;
		const selectedLiunianIndex = data.selectedLiunianIndex ?? 0;
		const liunianYear = dayunStartYear + selectedLiunianIndex;

		// 获取选中流年的干支
		const liuNianGanZhi = this.paipan.getYearGanZhi(liunianYear);
		const liuNianGan = liuNianGanZhi.gan;
		const liuNianZhi = liuNianGanZhi.zhi;

		// 获取选中的大运干支
		const dayunGan = selectedDayun.gan;
		const dayunZhi = selectedDayun.zhi;

		// 四柱干支
		const pillars: Array<{name: string, gan: string, zhi: string}> = [
			{ name: '年柱', gan: data.bazi.gztg[0] || '', zhi: data.bazi.dz[0] || '' },
			{ name: '月柱', gan: data.bazi.gztg[1] || '', zhi: data.bazi.dz[1] || '' },
			{ name: '日柱', gan: data.bazi.gztg[2] || '', zhi: data.bazi.dz[2] || '' },
			{ name: '时柱', gan: data.bazi.gztg[3] || '', zhi: data.bazi.dz[3] || '' }
		];

		// 日柱天干作为基准计算十神
		const riZhuGan = pillars[2]!.gan;
		if (!riZhuGan) return;

		// 第一行：标题（含首列时间）
		const headerRow = table.createEl('tr');
		['时间', '年柱', '月柱', '日柱', '时柱', '大运', '流年'].forEach(title => {
			const th = headerRow.createEl('th');
			th.setText(title);
			th.setCssProps({
				border: '1px solid #ccc',
				padding: '8px',
				backgroundColor: '#f5f5f5'
			});
		});

		// 第二行：十神关系
		// columns数组: 对应表格的列（年柱、月柱、日柱、时柱、大运、流年）
		const columns: Array<{gan: string, zhi: string, gz: string}> = [
			{ gan: pillars[0]!.gan, zhi: pillars[0]!.zhi, gz: pillars[0]!.gan + pillars[0]!.zhi },
			{ gan: pillars[1]!.gan, zhi: pillars[1]!.zhi, gz: pillars[1]!.gan + pillars[1]!.zhi },
			{ gan: pillars[2]!.gan, zhi: pillars[2]!.zhi, gz: pillars[2]!.gan + pillars[2]!.zhi },
			{ gan: pillars[3]!.gan, zhi: pillars[3]!.zhi, gz: pillars[3]!.gan + pillars[3]!.zhi },
			{ gan: dayunGan, zhi: dayunZhi, gz: dayunGan + dayunZhi },
			{ gan: liuNianGan, zhi: liuNianZhi, gz: liuNianGan + liuNianZhi }
		];

		// 获取性别信息用于显示元男/元女
		const genderText = data.gender === 0 ? '元男' : '元女';

		// 十神行：每列天干与日干的十神关系
		const shishenRow = table.createEl('tr');
		['十神',
		 this.paipan.getShiShenFull(riZhuGan, columns[0]!.gan),  // 年柱天干 vs 日干
		 this.paipan.getShiShenFull(riZhuGan, columns[1]!.gan),  // 月柱天干 vs 日干
		 genderText,                                               // 日柱：元男或元女
		 this.paipan.getShiShenFull(riZhuGan, columns[3]!.gan),  // 时柱天干 vs 日干
		 this.paipan.getShiShenFull(riZhuGan, columns[4]!.gan),  // 大运天干 vs 日干
		 this.paipan.getShiShenFull(riZhuGan, columns[5]!.gan)   // 流年天干 vs 日干
		].forEach(text => {
			const td = shishenRow.createEl('td');
			td.setText(text);
			td.setCssProps({ border: '1px solid #ccc', padding: '8px', textAlign: 'center' });
		});

		// 后续数据行
		// 主气、中气、余气需要添加十神，天干有颜色，十神无颜色
		const getCangQiWithShiShen = (c: {gan: string, zhi: string}, type: 'main' | 'middle' | 'residual'): { gan: string, shishen: string, wuxing: string } => {
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
		}> = [
			{ label: '天干', values: columns.map(c => ({ text: c.gan, wuxing: this.paipan.getGanWuXing(c.gan) })) },
			{ label: '地支', values: columns.map(c => ({ text: c.zhi, wuxing: this.paipan.getZhiWuXing(c.zhi) })) },
			{ label: '主气', values: columns.map(c => getCangQiWithShiShen(c, 'main')), isCangQi: true },
			{ label: '中气', values: columns.map(c => getCangQiWithShiShen(c, 'middle')), isCangQi: true },
			{ label: '余气', values: columns.map(c => getCangQiWithShiShen(c, 'residual')), isCangQi: true },
			{ label: '纳音', values: columns.map(c => ({ text: this.paipan.getNaYin(c.gz) })) },
			{ label: '星运', values: columns.map(c => ({ text: this.paipan.getXingYun(riZhuGan, c.zhi) })) },
			{ label: '自坐', values: columns.map(c => ({ text: this.paipan.getZiZuo(c.gan, c.zhi) })) },
			{ label: '空亡', values: columns.map(c => ({ text: this.paipan.getXunKong(c.gz) })) }
		];

		rowConfig.forEach(rowData => {
			const row = table.createEl('tr');
			const first = row.createEl('td');
			first.setText(rowData.label);
			first.setCssProps({ padding: '8px', fontWeight: 'bold', textAlign: 'center' });
			rowData.values.forEach((val, idx) => {
				const td = row.createEl('td');
				td.setCssProps({ padding: '8px', textAlign: 'center' });

				if (rowData.isCangQi) {
					// 主气、中气、余气：天干有颜色，十神无颜色
					if (val.gan) {
						const ganSpan = td.createEl('span');
						ganSpan.setText(val.gan);
						if (val.wuxing) {
							ganSpan.addClass('c-' + val.wuxing);
						}
					}
					if (val.shishen) {
						const shishenSpan = td.createEl('span');
						shishenSpan.setText(val.shishen);
						// 十神不需要颜色，使用默认颜色
					}
				} else {
					// 其他行：整体应用颜色
					td.setText(val.text || '');
					if (val.wuxing) {
						td.addClass('c-' + val.wuxing);
					}
				}
			});
		});
	}

	selectDayun(index: number) {
		if (!this.currentData) return;
		this.currentData.selectedDayunIndex = index;
		// 切换大运时，重置流年索引为0
		this.currentData.selectedLiunianIndex = 0;
		this.displayResults();
	}

	selectLiunian(dayunIndex: number, liunianIndex: number) {
		if (!this.currentData) return;
		this.currentData.selectedDayunIndex = dayunIndex;
		this.currentData.selectedLiunianIndex = liunianIndex;
		this.displayResults();
	}

	selectXiaoyun() {
		if (!this.currentData) return;
		// 设置selectedDayunIndex为-1表示选中的是小运
		this.currentData.selectedDayunIndex = -1;
		this.currentData.selectedLiunianIndex = 0;
		this.displayResults();
	}

	saveCase() {
		if (!this.currentData) {
			new Notice('请先计算八字');
			return;
		}

		const modal = new TitleInputModal(this.app, (title: string) => {
			if (title) {
				void this.plugin.saveBaziToFile(title, this.currentData!);
			}
		});
		modal.open();
	}}

class TitleInputModal extends Modal {
	onSubmit: (title: string) => void;

	constructor(app: App, onSubmit: (title: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('输入案例标题');

		const input = contentEl.createEl('input', {
			type: 'text',
			placeholder: '命例'
		});
		input.value = '命例';
		input.setCssProps({
			width: '100%',
			marginBottom: '10px'
		});

		const buttonContainer = contentEl.createEl('div');
		buttonContainer.setCssProps({
			display: 'flex',
			gap: '10px',
			justifyContent: 'flex-end'
		});

		const cancelBtn = buttonContainer.createEl('button', { text: '取消' });
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		const submitBtn = buttonContainer.createEl('button', { text: '确定' });
		submitBtn.addEventListener('click', () => {
			this.onSubmit(input.value.trim());
			this.close();
		});

		// 回车键提交
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				this.onSubmit(input.value.trim());
				this.close();
			}
		});

		// 聚焦到输入框
		setTimeout(() => input.focus(), 10);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class TimeSettingModal extends Modal {
	view: BaziView;

	constructor(app: App, view: BaziView) {
		super(app);
		this.view = view;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('设置时间');

		// 选项卡
		const tabContainer = contentEl.createEl('div');
		const tabs = ['公历', '农历', '干支'];
		let activeTab = 0;

		const tabButtons = tabContainer.createEl('div');
		tabButtons.setCssProps({ display: 'flex', marginBottom: '10px' });
		tabs.forEach((tab, index) => {
			const btn = tabButtons.createEl('button', { text: tab });
			btn.addEventListener('click', () => {
				activeTab = index;
				this.renderTabContent(contentEl, activeTab);
			});
		});

		this.renderTabContent(contentEl, activeTab);
	}

	renderTabContent(contentEl: Element, tabIndex: number) {
		// 清除旧内容
		const existing = contentEl.querySelector('.tab-content');
		if (existing) existing.remove();

		const tabContent = contentEl.createEl('div');
		tabContent.addClass('tab-content');

		if (tabIndex === 0) { // 公历
			this.renderGregorianTab(tabContent);
		} else if (tabIndex === 1) { // 农历
			this.renderLunarTab(tabContent);
		} else if (tabIndex === 2) { // 干支
			this.renderBaziTab(tabContent);
		}

		// 性别选择
		const genderContainer = tabContent.createEl('div');
		genderContainer.createEl('label', { text: '性别: ' });
		const genderSelect = genderContainer.createEl('select');
		genderSelect.createEl('option', { text: '男', value: '0' });
		genderSelect.createEl('option', { text: '女', value: '1' });

		// 城市选择 - 两级联动
		const cityContainer = tabContent.createEl('div');
		cityContainer.setCssProps({ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' });

		// 省份选择
		const provinceLabel = cityContainer.createEl('span');
		provinceLabel.setText('省份: ');
		const provinceSelect = cityContainer.createEl('select');
		provinceSelect.setCssProps({ marginRight: '10px' });

		// 城市选择
		const cityLabel = cityContainer.createEl('span');
		cityLabel.setText('城市: ');
		const citySelect = cityContainer.createEl('select');

		// 填充省份下拉框
		PROVINCE_CITY_GROUPS.forEach((group, index) => {
			provinceSelect.createEl('option', { text: group.province.name, value: index.toString() });
		});

		// 根据当前设置确定初始省份和城市
		const currentCity = this.view.plugin.settings.city || '杭州';
		let initialProvinceIndex = 0;
		let initialCityValue = currentCity;

		// 尝试找到当前城市对应的省份
		for (let i = 0; i < PROVINCE_CITY_GROUPS.length; i++) {
			const group = PROVINCE_CITY_GROUPS[i];
			if (!group) continue;
			const foundCity = group.cities.find(c => c.name === currentCity);
			if (foundCity) {
				initialProvinceIndex = i;
				initialCityValue = foundCity.name;
				break;
			}
		}

		// 填充城市下拉框（根据选中的省份）
		const updateCitySelect = (provinceIndex: number) => {
			citySelect.innerHTML = '';
			const group = PROVINCE_CITY_GROUPS[provinceIndex];
			if (!group) return;
			const cities = group.cities;
			cities.forEach(city => {
				citySelect.createEl('option', { text: city.name, value: city.name });
			});
			// 如果当前城市在列表中，选中它
			const hasCurrentCity = cities.some(c => c.name === initialCityValue);
			if (hasCurrentCity) {
				citySelect.value = initialCityValue;
			}
		};

		// 初始化
		provinceSelect.value = initialProvinceIndex.toString();
		updateCitySelect(initialProvinceIndex);

		// 省份变更时更新城市列表
		provinceSelect.addEventListener('change', () => {
			const idx = parseInt((provinceSelect as HTMLSelectElement).value);
			updateCitySelect(idx);
		});

		// 按钮
		const buttonContainer = tabContent.createEl('div');
		buttonContainer.setCssProps({
			display: 'flex',
			gap: '10px',
			justifyContent: 'flex-end',
			marginTop: '20px'
		});

		const cancelBtn = buttonContainer.createEl('button', { text: '取消' });
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		const submitBtn = buttonContainer.createEl('button', { text: '确定' });
		submitBtn.addEventListener('click', () => {
			// 根据tabIndex获取时间并计算
			let year: number, month: number, day: number, hour: number, minute: number, second: number;
			const gender = parseInt((genderSelect as HTMLSelectElement).value);

			// 获取选择的城市并更新设置
			const selectedCity = (citySelect as HTMLSelectElement).value;
			const cityData = CITIES.find(c => c.name === selectedCity);
			if (cityData) {
				this.view.plugin.settings.city = selectedCity;
				this.view.plugin.settings.longitude = cityData.longitude.toString();
				this.view.plugin.settings.latitude = cityData.latitude.toString();
				// 更新排盘引擎的经纬度
				this.view.paipan.J = cityData.longitude;
				this.view.paipan.W = cityData.latitude;
				void this.view.plugin.saveSettings();
			}

			if (tabIndex === 0) {
				// 公历
				const selects = tabContent.querySelectorAll('select');
				year = parseInt((selects[0] as HTMLSelectElement).value);
				month = parseInt((selects[1] as HTMLSelectElement).value);
				day = parseInt((selects[2] as HTMLSelectElement).value);
				hour = parseInt((selects[3] as HTMLSelectElement).value);
				minute = parseInt((selects[4] as HTMLSelectElement).value);
				second = parseInt((selects[5] as HTMLSelectElement).value);
			} else if (tabIndex === 1) {
				// 农历 - 需要转换
				// 暂时使用公历逻辑，实际需要农历转换
				new Notice('农历输入暂未实现');
				return;
			} else {
				// 干支 - 需要倒推
				new Notice('干支倒推暂未实现');
				return;
			}

			this.view.calculateAndDisplay(year, month, day, hour, minute, second, gender);
			this.close();
		});
	}

	renderGregorianTab(container: Element) {
		const now = new Date();
		const currentData = this.view.currentData;
		const currentYear = currentData?.year ?? now.getFullYear();
		const currentMonth = currentData?.month ?? now.getMonth() + 1;
		const currentDay = currentData?.day ?? now.getDate();
		const currentHour = currentData?.hour ?? now.getHours();
		const currentMinute = currentData?.minute ?? now.getMinutes();
		const currentSecond = currentData?.second ?? now.getSeconds();

		// 年
		const yearContainer = container.createEl('div');
		yearContainer.createEl('label', { text: '年: ' });
		const yearSelect = yearContainer.createEl('select');
		for (let y = 1600; y <= 2100; y++) {
			yearSelect.createEl('option', { text: y.toString(), value: y.toString() });
		}
		yearSelect.value = currentYear.toString();

		// 月
		const monthContainer = container.createEl('div');
		monthContainer.createEl('label', { text: '月: ' });
		const monthSelect = monthContainer.createEl('select');
		for (let m = 1; m <= 12; m++) {
			monthSelect.createEl('option', { text: m.toString(), value: m.toString() });
		}
		monthSelect.value = currentMonth.toString();

		// 日
		const dayContainer = container.createEl('div');
		dayContainer.createEl('label', { text: '日: ' });
		const daySelect = dayContainer.createEl('select');
		for (let d = 1; d <= 31; d++) {
			daySelect.createEl('option', { text: d.toString(), value: d.toString() });
		}
		daySelect.value = currentDay.toString();

		// 时
		const hourContainer = container.createEl('div');
		hourContainer.createEl('label', { text: '时: ' });
		const hourSelect = hourContainer.createEl('select');
		for (let h = 0; h < 24; h++) {
			hourSelect.createEl('option', { text: h.toString(), value: h.toString() });
		}
		hourSelect.value = currentHour.toString();

		// 分
		const minuteContainer = container.createEl('div');
		minuteContainer.createEl('label', { text: '分: ' });
		const minuteSelect = minuteContainer.createEl('select');
		for (let m = 0; m < 60; m++) {
			minuteSelect.createEl('option', { text: m.toString(), value: m.toString() });
		}
		minuteSelect.value = currentMinute.toString();

		// 秒
		const secondContainer = container.createEl('div');
		secondContainer.createEl('label', { text: '秒: ' });
		const secondSelect = secondContainer.createEl('select');
		for (let s = 0; s < 60; s++) {
			secondSelect.createEl('option', { text: s.toString(), value: s.toString() });
		}
		secondSelect.value = currentSecond.toString();
	}

	renderLunarTab(container: Element) {
		container.createEl('p', { text: '农历输入功能开发中...' });
	}

	renderBaziTab(container: Element) {
		container.createEl('p', { text: '干支倒推功能开发中...' });
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

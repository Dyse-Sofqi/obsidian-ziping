import { ItemView, WorkspaceLeaf, Modal, Notice, App } from 'obsidian';
import { Paipan, BaziResult, CurrentDayunData, NearbySolarTerms, DayunItem } from './Paipan';
import { CITIES } from './settings';
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
		container.createEl('h2', { text: '八字排盘' });

		// 设置时间按钮
		const setTimeBtn = container.createEl('button', { text: '设置时间' });
		setTimeBtn.addEventListener('click', () => {
			new TimeSettingModal(this.app, this).open();
		});

		// 结果显示区域
		this.createResultArea(container);

		// 回到现在按钮
		const currentTimeBtn = container.createEl('button', { text: '回到现在' });
		currentTimeBtn.setCssProps({
			marginTop: '20px'
		});
		currentTimeBtn.addEventListener('click', () => {
			this.loadCurrentTime();
		});

		// 保存按钮
		const saveBtn = container.createEl('button', { text: '保存案例' });
		saveBtn.setCssProps({
			marginTop: '20px'
		});
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
			overflow: 'auto'
		});
	}

	calculateAndDisplay(year: number, month: number, day: number, hour: number, minute: number, second: number, gender: number) {
		try {
			const bazi = this.paipan.fatemaps(gender, year, month, day, hour, minute, second);
			const solarTerms = this.paipan.getNearbySolarTerms(year, month, day);
			const dayunData = this.paipan.getCurrentDayun(year, month, day, gender);

			this.currentData = {
				year, month, day, hour, minute, second, gender,
				bazi,
				solarTerms,
				dayun: dayunData
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
		if (data.solarTerms.previous || data.solarTerms.next) {
			const solarDiv = resultContainer.createEl('div');
			const now = new Date();
			if (data.solarTerms.previous) {
				solarDiv.createEl('p', {
					text: `上个节气: ${data.solarTerms.previous.name} (${data.solarTerms.previous.date.toLocaleString()})`
				});
			}
			if (data.solarTerms.next) {
				const timeToNext = Math.floor((data.solarTerms.next.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
				solarDiv.createEl('p', {
					text: `下个节气: ${data.solarTerms.next.name} (${data.solarTerms.next.date.toLocaleString()}) - 距离 ${timeToNext} 天`
				});
			}
		}

		// 干支四柱表格
		this.createBaziTable(resultContainer, data);

		// 大运信息
		const dayunDiv = resultContainer.createEl('div');
		dayunDiv.createEl('p', { text: `起运时间: ${data.dayun.startAge}岁` });

		// 大运列表
		const dayunList = dayunDiv.createEl('div');
		dayunList.setCssProps({
			display: 'flex',
			flexWrap: 'wrap',
			gap: '5px',
			marginBottom: '10px'
		});

		data.dayun.allDayun.slice(0, 8).forEach((dy: DayunItem, index: number) => {
			const btn = dayunList.createEl('button', {
				text: `${dy.age}岁-${dy.gz}`,
				cls: dy.age === data.dayun.currentDayun.age ? 'mod-cta' : ''
			});
			btn.addEventListener('click', () => {
				this.selectDayun(index);
			});
		});

		// 当前大运和流年
		const now = new Date();
		dayunDiv.createEl('p', {
			text: `当前大运: ${data.dayun.currentDayun.age}岁 - ${data.dayun.currentDayun.gz} (流年: ${now.getFullYear()}年)`
		});
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

		// 获取流年干支
		const currentYear = new Date().getFullYear();
		const liuNianGanZhi = this.paipan.getYearGanZhi(currentYear);
		const liuNianGan = liuNianGanZhi.gan;
		const liuNianZhi = liuNianGanZhi.zhi;

		// 获取大运干支
		const dayunGan = data.dayun.currentDayun.gan;
		const dayunZhi = data.dayun.currentDayun.zhi;

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
		['时间', '流年', '大运', '年柱', '月柱', '日柱', '时柱'].forEach(title => {
			const th = headerRow.createEl('th');
			th.setText(title);
			th.setCssProps({
				border: '1px solid #ccc',
				padding: '8px',
				backgroundColor: '#f5f5f5'
			});
		});

		// 第二行：十神关系
		// columns数组: 对应表格的6列（流年、大运、年柱、月柱、日柱、时柱）
		const columns: Array<{gan: string, zhi: string, gz: string}> = [
			{ gan: liuNianGan, zhi: liuNianZhi, gz: liuNianGan + liuNianZhi },
			{ gan: dayunGan, zhi: dayunZhi, gz: dayunGan + dayunZhi },
			{ gan: pillars[0]!.gan, zhi: pillars[0]!.zhi, gz: pillars[0]!.gan + pillars[0]!.zhi },
			{ gan: pillars[1]!.gan, zhi: pillars[1]!.zhi, gz: pillars[1]!.gan + pillars[1]!.zhi },
			{ gan: pillars[2]!.gan, zhi: pillars[2]!.zhi, gz: pillars[2]!.gan + pillars[2]!.zhi },
			{ gan: pillars[3]!.gan, zhi: pillars[3]!.zhi, gz: pillars[3]!.gan + pillars[3]!.zhi }
		];

		// 十神行：每列天干与日干的十神关系
		const shishenRow = table.createEl('tr');
		['十神',
		 this.paipan.getShiShen(riZhuGan, columns[0]!.gan),  // 流年天干 vs 日干
		 this.paipan.getShiShen(riZhuGan, columns[1]!.gan),  // 大运天干 vs 日干
		 this.paipan.getShiShen(riZhuGan, columns[2]!.gan),  // 年柱天干 vs 日干
		 this.paipan.getShiShen(riZhuGan, columns[3]!.gan),  // 月柱天干 vs 日干
		 '身',                                                // 日干本身
		 this.paipan.getShiShen(riZhuGan, columns[5]!.gan)   // 时柱天干 vs 日干
		].forEach(text => {
			const td = shishenRow.createEl('td');
			td.setText(text);
			td.setCssProps({ border: '1px solid #ccc', padding: '8px', textAlign: 'center' });
		});

		// 后续数据行
		const rowConfig = [
			{ label: '天干', values: columns.map(c => c.gan), wuxing: columns.map(c => this.paipan.getGanWuXing(c.gan)) },
			{ label: '地支', values: columns.map(c => c.zhi), wuxing: columns.map(c => this.paipan.getZhiWuXing(c.zhi)) },
			{ label: '主气', values: columns.map(c => this.paipan.getCangQi(c.zhi).main), wuxing: columns.map(c => this.paipan.getGanWuXing(this.paipan.getCangQi(c.zhi).main)) },
			{ label: '中气', values: columns.map(c => this.paipan.getCangQi(c.zhi).middle), wuxing: columns.map(c => this.paipan.getGanWuXing(this.paipan.getCangQi(c.zhi).middle)) },
			{ label: '余气', values: columns.map(c => this.paipan.getCangQi(c.zhi).residual), wuxing: columns.map(c => this.paipan.getGanWuXing(this.paipan.getCangQi(c.zhi).residual)) },
			{ label: '纳音', values: columns.map(c => this.paipan.getNaYin(c.gz)) },
			{ label: '星运', values: columns.map(c => this.paipan.getXingYun(riZhuGan, c.zhi)) },
			{ label: '自坐', values: columns.map(c => this.paipan.getZiZuo(c.gan, c.zhi)) },
			{ label: '空亡', values: columns.map(c => this.paipan.getXunKong(c.gz)) }
		];

		rowConfig.forEach(rowData => {
			const row = table.createEl('tr');
			const first = row.createEl('td');
			first.setText(rowData.label);
			first.setCssProps({ padding: '8px', fontWeight: 'bold', textAlign: 'center' });
			rowData.values.forEach((val, idx) => {
				const td = row.createEl('td');
				td.setText(val);
				td.setCssProps({ padding: '8px', textAlign: 'center' });
				// 为天干和地支行添加五行颜色 - 使用CSS类
				const wuxing = rowData.wuxing ? rowData.wuxing[idx] : undefined;
				if (wuxing) {
					td.addClass('c-' + wuxing);
				}
			});
		});
	}

	selectDayun(index: number) {
		if (!this.currentData) return;
		this.currentData.selectedDayunIndex = index;
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

		// 城市选择
		const cityContainer = tabContent.createEl('div');
		cityContainer.setCssProps({ marginTop: '10px' });
		cityContainer.createEl('label', { text: '城市: ' });
		const citySelect = cityContainer.createEl('select');
		const currentCity = this.view.plugin.settings.city || '杭州';
		CITIES.forEach(city => {
			citySelect.createEl('option', { text: city.name, value: city.name });
		});
		citySelect.value = currentCity;

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

		// 年
		const yearContainer = container.createEl('div');
		yearContainer.createEl('label', { text: '年: ' });
		const yearSelect = yearContainer.createEl('select');
		const currentYear = now.getFullYear();
		for (let y = currentYear - 100; y <= currentYear + 10; y++) {
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
		monthSelect.value = (now.getMonth() + 1).toString();

		// 日
		const dayContainer = container.createEl('div');
		dayContainer.createEl('label', { text: '日: ' });
		const daySelect = dayContainer.createEl('select');
		for (let d = 1; d <= 31; d++) {
			daySelect.createEl('option', { text: d.toString(), value: d.toString() });
		}
		daySelect.value = now.getDate().toString();

		// 时
		const hourContainer = container.createEl('div');
		hourContainer.createEl('label', { text: '时: ' });
		const hourSelect = hourContainer.createEl('select');
		for (let h = 0; h < 24; h++) {
			hourSelect.createEl('option', { text: h.toString(), value: h.toString() });
		}
		hourSelect.value = now.getHours().toString();

		// 分
		const minuteContainer = container.createEl('div');
		minuteContainer.createEl('label', { text: '分: ' });
		const minuteSelect = minuteContainer.createEl('select');
		for (let m = 0; m < 60; m++) {
			minuteSelect.createEl('option', { text: m.toString(), value: m.toString() });
		}
		minuteSelect.value = now.getMinutes().toString();

		// 秒
		const secondContainer = container.createEl('div');
		secondContainer.createEl('label', { text: '秒: ' });
		const secondSelect = secondContainer.createEl('select');
		for (let s = 0; s < 60; s++) {
			secondSelect.createEl('option', { text: s.toString(), value: s.toString() });
		}
		secondSelect.value = now.getSeconds().toString();
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

import { ItemView, WorkspaceLeaf, Modal, Notice, App } from 'obsidian';
import { Paipan, BaziResult, CurrentDayunData, NearbySolarTerms, DayunItem } from './Paipan';
import { CITIES, PROVINCE_CITY_GROUPS } from './settings';
import ZipingPlugin from './main';
import { domToBlob } from 'modern-screenshot';

interface CurrentBaziData {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	gender: number;
	name: string;
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
		return "子平排盘";
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
		// 创建按钮行容器
		const buttonRow = container.createDiv('button-row-ziping');

		// 设置时间按钮
		const setTimeBtn = buttonRow.createEl('button', { text: '设置时间' });
		setTimeBtn.addEventListener('click', () => {
			new TimeSettingModal(this.app, this).open();
		});

		// 回到现在按钮
		const currentTimeBtn = buttonRow.createEl('button', { text: '回到现在' });
		currentTimeBtn.addEventListener('click', () => {
			this.loadCurrentTime();
		});

		// 保存按钮
		const saveBtn = buttonRow.createEl('button', { text: '保存案例', cls: 'save-btn-btn' });
		saveBtn.addEventListener('click', () => {
			this.saveCase();
		});

		//复制截图到剪切板
		// 调用 createResultArea，传入 buttonRow 或直接获取 copyBtn 后添加
		const copyBtn = this.createResultArea(container); // 修改 createResultArea 使其返回按钮
		buttonRow.appendChild(copyBtn); // 将 copyBtn 添加到同一行
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
			0, // 默认男
			'案例' // 默认姓名
		);
	}

	createResultArea(container: HTMLElement) {
		const resultContainer = container.createEl('div');
		resultContainer.id = 'bazi-result';
		resultContainer.setCssProps({
			marginTop: '0px',
			padding: '5px',
			border: '1px solid #ccc',
			minHeight: '200px',
			maxHeight: '400px',
			overflow: 'auto',
			width: 'fit-content',
			position: 'relative'
		});

		// Add copy button
		const copyBtn = container.createEl('button', { text: '复制截图', cls: 'copy-screenshot-btn' });
		// copyBtn.setCssProps({ position: 'absolute', top: '10px', right: '10px', zIndex: '600' });

		// 在你的截图按钮回调中
		copyBtn.addEventListener('click', () => {
			void (async () => {
				try {
					await document.fonts.ready;
					// 获取背景色：优先从 CSS 变量获取，若为空则从 body 获取计算后的背景色
					let bgColor = getComputedStyle(document.documentElement)
						.getPropertyValue('--background-secondary')
						.trim();
					// 如果 CSS 变量为空，尝试从 body 获取背景色
					if (!bgColor) {
						bgColor = getComputedStyle(document.body).backgroundColor;
					}
					// 如果仍然为空，使用默认浅灰色
					if (!bgColor) {
						bgColor = '#f5f5f5';
					}
					const blob = await domToBlob(resultContainer, {
						scale: window.devicePixelRatio * 2 || 2,
						backgroundColor: bgColor,
						quality: 1,
					});
					if (blob) {
						const item = new ClipboardItem({ 'image/png': blob });
						await navigator.clipboard.write([item]);
						new Notice('截图已复制到剪贴板');
					}
				} catch (error) {
					let errorMessage = '未知错误';
					if (error instanceof Error) {
						errorMessage = error.message;
					} else if (typeof error === 'string') {
						errorMessage = error;
					} else {
						errorMessage = JSON.stringify(error);
					}
					new Notice('截图失败: ' + errorMessage);
				}
			})();
		});
		return copyBtn;
	}

	calculateAndDisplay(year: number, month: number, day: number, hour: number, minute: number, second: number, gender: number, name: string = '案例') {
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

			// 如果姓名是默认的"案例"，自动设置为排盘码格式
			if (name === '案例') {
				const genderCode = gender === 0 ? 'Y' : 'X';
				name = `${String(year)}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}-${String(hour).padStart(2, '0')}.${String(minute).padStart(2, '0')}-${genderCode}`;
			}

			this.currentData = {
				year, month, day, hour, minute, second, gender, name,
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

		// 真太阳时与公历在同一行展示
		let timeText = `公历：${date.getFullYear()}年${data.month}月${data.day}日 ${String(data.hour).padStart(2, '0')}:${String(data.minute).padStart(2, '0')}:${String(data.second).padStart(2, '0')}`;
		if (data.bazi.zty) {
			const zty = data.bazi.zty;
			const cityName = this.plugin.settings.city || '';
			timeText += ` | 真太阳时：${String(zty.hour).padStart(2, '0')}:${String(zty.minute).padStart(2, '0')}:${String(zty.second).padStart(2, '0')}`;
		}
		timeDiv.createEl('p', { text: timeText });

		// 获取农历信息
		const lunarDate = this.paipan.getLunarDate(data.year, data.month, data.day);
		if (lunarDate) {
			const lunarYearStr = lunarDate.isLeap ? `${lunarDate.year}年闰${lunarDate.monthName}` : `${lunarDate.year}年${lunarDate.monthName}`;
			const lunarDayStr = this.paipan.getLunarDayName(lunarDate.day);
			timeDiv.createEl('p', { text: `农历：${lunarYearStr}${lunarDayStr}` });
		} else {
			timeDiv.createEl('p', { text: `农历：[计算失败]` });
		}

		// 节气信息
		if (data.solarTerms.previous && data.solarTerms.next) {
			const solarDiv = resultContainer.createEl('div');
			const formatDateTime = (date: Date) => {
				const hours = date.getHours().toString().padStart(2, '0');
				const minutes = date.getMinutes().toString().padStart(2, '0');
				return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`;
			};
			solarDiv.createEl('p', {
				text: `节气：${data.solarTerms.previous.name}${formatDateTime(data.solarTerms.previous.date)}-${data.solarTerms.next.name}${formatDateTime(data.solarTerms.next.date)}`
			});
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

		// 时间调整函数
		const adjustTime = (hourDelta: number) => {
			if (!this.currentData) {
				new Notice('请先设置时间');
				return;
			}
			const date = new Date(
				this.currentData.year,
				this.currentData.month - 1,
				this.currentData.day,
				this.currentData.hour,
				this.currentData.minute,
				this.currentData.second
			);
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
		hourMinusBtn.addEventListener('click', () => adjustTime(-1));
		hourPlusBtn.addEventListener('click', () => adjustTime(1));

		// 干支四柱表格
		this.createBaziTable(resultContainer, data);

		// 当前大运和流年 - 显示选中的大运或小运和流年
		let displayText = '';
		if (data.selectedDayunIndex === -1) {
			// 小运模式
			const xiaoyunYear = data.year + (data.selectedLiunianIndex ?? 0);
			// 计算命主虚岁：流年年份 - 出生年份 + 1
			const age = xiaoyunYear - data.year + 1;
			// 计算小运干支
			const hourGan = data.bazi.gztg[3] || '';
			const hourZhi = data.bazi.dz[3] || '';
			const xiaoYun = this.paipan.getXiaoYun(hourGan, hourZhi, data.year, data.gender, age);
			const selectedLiunianYear = data.year + (data.selectedLiunianIndex ?? 0);
			const liuNianGanZhi = this.paipan.getYearGanZhi(selectedLiunianYear);
			displayText = `小运：${xiaoYun.gan}${xiaoYun.zhi}。流年：${xiaoyunYear}年${liuNianGanZhi.gan}${liuNianGanZhi.zhi}，${age}岁`;
		} else {
			const selectedDayunForDisplay = data.dayun.allDayun[data.selectedDayunIndex ?? 0] || data.dayun.currentDayun;
			const selectedLiunianIndex = data.selectedLiunianIndex ?? 0;
			const selectedLiunianYear = selectedDayunForDisplay.startYear + selectedLiunianIndex;
			// 计算命主虚岁：流年年份 - 出生年份 + 1
			const age = selectedLiunianYear - data.year + 1;
			// 提前计算流年干支
			const liuNianGanZhi = this.paipan.getYearGanZhi(selectedLiunianYear);
			displayText = `大运：${selectedDayunForDisplay.gz}。流年: ${selectedLiunianYear}年${liuNianGanZhi.gan}${liuNianGanZhi.zhi}，${age}岁`;
		}

		// 大运信息
		const dayunDiv = resultContainer.createEl('div');
		dayunDiv.createEl('p', { text: `起运时间：${data.dayun.startAge}岁。${data.dayun.qyy_desc2 ? ' ' + data.dayun.qyy_desc2 : ''}` });
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
		// 小运范围：1岁到起运年龄
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

		// 获取选中大运用于计算小运年龄
		const selectedDayunForLiunian = isXiaoyunMode ? null : (data.dayun.allDayun[selectedIndex] || data.dayun.currentDayun);

		for (let i = 0; i < displayYearCount; i++) {
			const year = dayunStartYear + i;
			const liuNianGanZhi = this.paipan.getYearGanZhi(year);
			const ganShishen = this.paipan.getShiShen(riZhuGan, liuNianGanZhi.gan);
			const zhiShishen = this.paipan.getZhiShiShen(riZhuGan, liuNianGanZhi.zhi);

			// 计算小运干支（添加参数验证）
			const hourGan = data.bazi.gztg[3] || '';
			const hourZhi = data.bazi.dz[3] || '';
			if (!hourGan || !hourZhi) {
				console.error('时柱天干地支数据无效');
				continue;
			}
			// 计算小运年龄：小运模式从1岁开始
			// 大运模式下，大运第一年的小运应该比小运最后一年再往后推一位
			// 例如：小运最后一年是5岁(step=5)，大运第一年的小运应该是step=6
			const xiaoYunAge = isXiaoyunMode ? (i + 1) : (selectedDayunForLiunian!.age + i + 1);
			const xiaoYun = this.paipan.getXiaoYun(
				hourGan,          // 时柱天干
				hourZhi,          // 时柱地支
				data.year,        // 出生年
				data.gender,      // 性别
				xiaoYunAge        // 年龄
			);
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
			// 第四行：小运干支（作为独立行）
			const xiaoYunRow = btn.createEl('div');
			xiaoYunRow.setText(`${xiaoYun.gan}${xiaoYun.zhi}`);
			xiaoYunRow.addClass('liunian-row');

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
			marginTop: '5px'
		});

		// 判断是否是小运模式
		const isXiaoyunMode = data.selectedDayunIndex === -1;
		const selectedLiunianIndex = data.selectedLiunianIndex ?? 0;

		// 获取选中流年的年份和干支
		let liunianYear: number;
		let dayunGan: string;
		let dayunZhi: string;
		let dayunHeaderTitle: string;

		if (isXiaoyunMode) {
			// 小运模式：流年年份 = 出生年 + 流年索引
			liunianYear = data.year + selectedLiunianIndex;
			// 计算小运干支：虚岁 = 流年年份 - 出生年 + 1
			const age = liunianYear - data.year + 1;
			const hourGan = data.bazi.gztg[3] || '';
			const hourZhi = data.bazi.dz[3] || '';
			const xiaoYun = this.paipan.getXiaoYun(hourGan, hourZhi, data.year, data.gender, age);
			dayunGan = xiaoYun.gan;
			dayunZhi = xiaoYun.zhi;
			dayunHeaderTitle = '小运';
		} else {
			// 大运模式
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

		// 第一行：标题（含首列时间）
		const headerRow = table.createEl('tr');
		['时间', '年柱', '月柱', '日柱', '时柱', dayunHeaderTitle, '流年'].forEach(title => {
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
		const columns: Array<{ gan: string, zhi: string, gz: string }> = [
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
							ganSpan.style.fontWeight = '600';
						}
					}
					if (val.shishen) {
						const shishenSpan = td.createEl('span');
						shishenSpan.setText(val.shishen);
						// 十神不需要颜色，使用默认颜色
					}
				} else if (rowData.isXunKong) {
					// 空亡行：日柱对应的空亡加粗显示
					td.setText(val.text || '');
					if (idx === 2) { // 日柱是第3列（索引为2）
						td.style.fontWeight = 'bold';
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

		// 生成排盘码作为默认标题
		const genderCode = this.currentData.gender === 0 ? 'Y' : 'X';
		const defaultTitle = `${String(this.currentData.year)}.${String(this.currentData.month).padStart(2, '0')}.${String(this.currentData.day).padStart(2, '0')}-${String(this.currentData.hour).padStart(2, '0')}.${String(this.currentData.minute).padStart(2, '0')}-${genderCode}`;

		// 如果用户已输入姓名，使用姓名；否则使用排盘码
		const title = this.currentData.name && this.currentData.name !== defaultTitle ? this.currentData.name : defaultTitle;
		void this.plugin.saveBaziToFile(title, this.currentData);
	}
}

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

	// 存储选中的时间值
	selectedYear: number;
	selectedMonth: number;
	selectedDay: number;
	selectedHour: number;
	selectedMinute: number;
	selectedSecond: number;

	constructor(app: App, view: BaziView) {
		super(app);
		this.view = view;

		// 初始化时间值
		this.selectedYear = 0;
		this.selectedMonth = 0;
		this.selectedDay = 0;
		this.selectedHour = 0;
		this.selectedMinute = 0;
		this.selectedSecond = 0;
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
		const tabButtonElements: HTMLButtonElement[] = [];
		tabs.forEach((tab, index) => {
			const btn = tabButtons.createEl('button', { text: tab });
			tabButtonElements.push(btn);
			btn.addEventListener('click', () => {
				activeTab = index;
				// 更新所有按钮的样式
				tabButtonElements.forEach((button, i) => {
					if (i === index) {
						button.setCssProps({
							backgroundColor: 'var(--background-secondary)',
							color: 'var(--interactive-accent)',
							border: 'none'
						});
					} else {
						button.setCssProps({
							backgroundColor: '#f1f1f1',
							color: 'black',
							border: '1px solid #ccc'
						});
					}
				});
				this.renderTabContent(contentEl, activeTab);
			});
		});
		// 初始化第一个按钮为选中状态
		if (tabButtonElements.length > 0 && tabButtonElements[0]) {
			tabButtonElements[0].setCssProps({
				backgroundColor: 'var(--background-secondary)',
				color: 'var(--interactive-accent)',
				border: 'none'
			});
		}

		this.renderTabContent(contentEl, activeTab);
	}

	renderTabContent(contentEl: Element, tabIndex: number) {
		// 清除旧内容
		const existing = contentEl.querySelector('.tab-content');
		if (existing) existing.remove();

		const tabContent = contentEl.createEl('div');
		tabContent.addClass('tab-content');

		// 姓名和性别在同一行
		const nameGenderRow = tabContent.createEl('div');
		nameGenderRow.setCssProps({ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px' });

		// 姓名输入
		const nameLabel = nameGenderRow.createEl('label', { text: '姓名: ' });

		// 生成排盘码作为默认值
		const currentData = this.view.currentData;
		let defaultName = '案例';
		if (currentData) {
			const genderCode = currentData.gender === 0 ? 'Y' : 'X';
			defaultName = `${String(currentData.year)}.${String(currentData.month).padStart(2, '0')}.${String(currentData.day).padStart(2, '0')}-${String(currentData.hour).padStart(2, '0')}.${String(currentData.minute).padStart(2, '0')}-${genderCode}`;
		}

		const nameInput = nameGenderRow.createEl('input', {
			type: 'text',
			value: defaultName
		});
		nameInput.setCssProps({ padding: '5px', border: '1px solid #ccc', borderRadius: '3px' });

		// 点击后自动清除默认文本
		nameInput.addEventListener('focus', () => {
			if (nameInput.value === defaultName) {
				nameInput.value = '';
			}
		});

		// 失去焦点时，如果未填写文本则恢复默认文本
		nameInput.addEventListener('blur', () => {
			if (nameInput.value.trim() === '') {
				nameInput.value = defaultName;
			}
		});

		// 性别选择
		const genderLabel = nameGenderRow.createEl('label', { text: '性别: ' });
		const genderContainer = nameGenderRow.createEl('div');
		genderContainer.setCssProps({ display: 'flex', gap: '10px' });

		// 男单选按钮
		const maleRadio = genderContainer.createEl('input', {
			type: 'radio',
			value: '0'
		});
		maleRadio.setAttribute('name', 'gender');
		maleRadio.checked = true;
		const maleLabel = genderContainer.createEl('label', { text: '男' });
		maleLabel.setCssProps({ marginLeft: '5px' });

		// 女单选按钮
		const femaleRadio = genderContainer.createEl('input', {
			type: 'radio',
			value: '1'
		});
		femaleRadio.setAttribute('name', 'gender');
		const femaleLabel = genderContainer.createEl('label', { text: '女' });
		femaleLabel.setCssProps({ marginLeft: '5px' });

		if (tabIndex === 0) { // 公历
			this.renderGregorianTab(tabContent);
		} else if (tabIndex === 1) { // 农历
			this.renderLunarTab(tabContent);
		} else if (tabIndex === 2) { // 干支
			this.renderBaziTab(tabContent);
		}

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
			let year: number;
			let month: number;
			let day: number;
			let hour: number;
			let minute: number;
			let second: number;
			const gender = parseInt(maleRadio.checked ? '0' : '1');

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
				// 性别选择是input元素，不是select元素，所以selects[0]就是年选择
				year = parseInt((selects[0] as HTMLSelectElement).value);
				month = parseInt((selects[1] as HTMLSelectElement).value);
				day = parseInt((selects[2] as HTMLSelectElement).value);
				hour = parseInt((selects[3] as HTMLSelectElement).value);
				minute = parseInt((selects[4] as HTMLSelectElement).value);
				// 使用当前盘面的秒级信息
				second = this.view.currentData?.second ?? new Date().getSeconds();
			} else if (tabIndex === 1) {
				// 农历 - 需要转换
				const selects = tabContent.querySelectorAll('select');
				// 性别选择是input元素，不是select元素，所以selects[0]就是年选择
				const lunarYear = parseInt((selects[0] as HTMLSelectElement).value);
				const monthValue = parseInt((selects[1] as HTMLSelectElement).value);
				// 判断是否为闰月（大于12的值表示闰月）
				const isLeap = monthValue > 12;
				const lunarMonth = isLeap ? monthValue - 12 : monthValue;
				const lunarDay = parseInt((selects[2] as HTMLSelectElement).value);
				hour = parseInt((selects[3] as HTMLSelectElement).value);
				minute = parseInt((selects[4] as HTMLSelectElement).value);
				// 使用当前盘面的秒级信息
				second = this.view.currentData?.second ?? new Date().getSeconds();

				// 调用paipan.js中的Lunar2Solar方法将农历转换为公历
				const solarDate = this.view.paipan.lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap);
				if (!solarDate) {
					new Notice('农历转换失败，请检查输入的农历日期');
					return;
				}
				year = solarDate.year;
				month = solarDate.month;
				day = solarDate.day;
			} else {
				// 干支 - 使用筛选出来的选中的可选项的公历时间排盘
				const now = new Date();
				year = this.selectedYear || now.getFullYear();
				month = this.selectedMonth || now.getMonth() + 1;
				day = this.selectedDay || now.getDate();
				hour = this.selectedHour || now.getHours();
				minute = this.selectedMinute || 0;
				second = this.selectedSecond || 0;
			}

			// 获取姓名信息
			const name = (nameInput as HTMLInputElement).value || '案例';
			this.view.calculateAndDisplay(year, month, day, hour, minute, second, gender, name);
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

		// 创建时间选择容器，所有下拉列表在同一行
		const timeRow = container.createEl('div');
		timeRow.setCssProps({ display: 'flex', gap: '0', alignItems: 'center', marginBottom: '15px' });

		// 时间标签
		timeRow.createEl('label', { text: '时间：' });

		// 年
		const yearSelect = timeRow.createEl('select');
		yearSelect.setCssProps({ padding: '5px', border: '1px solid #ccc', borderRadius: '0', borderRight: 'none' });
		for (let y = 1600; y <= 2100; y++) {
			yearSelect.createEl('option', { text: y.toString(), value: y.toString() });
		}
		yearSelect.value = currentYear.toString();

		// 月
		const monthSelect = timeRow.createEl('select');
		monthSelect.setCssProps({ padding: '5px', border: '1px solid #ccc', borderRadius: '0', borderRight: 'none' });
		for (let m = 1; m <= 12; m++) {
			monthSelect.createEl('option', { text: m.toString(), value: m.toString() });
		}
		monthSelect.value = currentMonth.toString();

		// 日
		const daySelect = timeRow.createEl('select');
		daySelect.setCssProps({ padding: '5px', border: '1px solid #ccc', borderRadius: '0', borderRight: 'none' });
		for (let d = 1; d <= 31; d++) {
			daySelect.createEl('option', { text: d.toString(), value: d.toString() });
		}
		daySelect.value = currentDay.toString();

		// 时
		const hourSelect = timeRow.createEl('select');
		hourSelect.setCssProps({ padding: '5px', border: '1px solid #ccc', borderRadius: '0', borderRight: 'none' });
		for (let h = 0; h < 24; h++) {
			hourSelect.createEl('option', { text: h.toString(), value: h.toString() });
		}
		hourSelect.value = currentHour.toString();

		// 分
		const minuteSelect = timeRow.createEl('select');
		minuteSelect.setCssProps({ padding: '5px', border: '1px solid #ccc', borderRadius: '0' });
		for (let m = 0; m < 60; m++) {
			minuteSelect.createEl('option', { text: m.toString(), value: m.toString() });
		}
		minuteSelect.value = currentMinute.toString();
	}

	renderLunarTab(container: Element) {
		const now = new Date();
		const currentData = this.view.currentData;

		// 获取当前日期的农历信息作为默认值
		let currentYear = now.getFullYear();
		let currentMonth = now.getMonth() + 1;
		let currentDay = now.getDate();
		let currentHour = now.getHours();
		let currentMinute = now.getMinutes();
		let isLeap = false;

		if (currentData) {
			const lunarDate = this.view.paipan.getLunarDate(currentData.year, currentData.month, currentData.day);
			if (lunarDate) {
				currentYear = lunarDate.year;
				currentMonth = lunarDate.month;
				currentDay = lunarDate.day;
				isLeap = lunarDate.isLeap;
			}
			currentHour = currentData.hour;
			currentMinute = currentData.minute;
		}

		// 创建时间选择容器，所有下拉列表在同一行
		const timeRow = container.createEl('div');
		timeRow.setCssProps({ display: 'flex', gap: '0', alignItems: 'center', marginBottom: '20px' });

		// 时间标签
		const timeLabel = timeRow.createEl('label', { text: '时间：' });
		timeLabel.style.margin = '0';
		timeLabel.style.padding = '0';

		// 年
		const yearSelect = timeRow.createEl('select');
		yearSelect.setCssProps({ padding: '5px', border: '1px solid #ccc', borderRadius: '0', borderRight: 'none' });
		for (let y = 1900; y <= 2100; y++) {
			yearSelect.createEl('option', { text: y.toString(), value: y.toString() });
		}
		yearSelect.value = currentYear.toString();

		// 月
		const monthSelect = timeRow.createEl('select');
		monthSelect.setCssProps({ padding: '5px', border: '1px solid #ccc', borderRadius: '0', borderRight: 'none' });

		// 根据年份获取月份列表，包括闰月
		const updateMonthOptions = (year: number) => {
			monthSelect.innerHTML = '';
			const monthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

			// 获取该年的闰月信息
			const leapMonth = this.view.paipan.getLeapMonth(year);

			// 添加普通月份
			for (let m = 1; m <= 12; m++) {
				const value = m.toString();
				const text = monthNames[m - 1];
				monthSelect.createEl('option', { text, value });
			}

			// 如果有闰月，添加闰月选项
			if (leapMonth > 0) {
				const leapValue = (leapMonth + 12).toString(); // 使用大于12的值表示闰月
				const leapText = '闰' + monthNames[leapMonth - 1];
				monthSelect.createEl('option', { text: leapText, value: leapValue });
			}

			// 尝试保持之前选中的月份
			if (currentMonth <= 12) {
				monthSelect.value = currentMonth.toString();
			} else if (leapMonth > 0 && currentMonth - 12 === leapMonth) {
				monthSelect.value = (leapMonth + 12).toString();
			}
		};

		// 初始化月份选项
		updateMonthOptions(currentYear);

		// 年份变化时更新月份选项
		yearSelect.addEventListener('change', () => {
			const year = parseInt((yearSelect as HTMLSelectElement).value);
			updateMonthOptions(year);
		});

		// 日
		const daySelect = timeRow.createEl('select');
		daySelect.setCssProps({ padding: '5px', border: '1px solid #ccc', borderRadius: '0', borderRight: 'none' });
		const dayNames = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
			'十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
			'廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
		for (let d = 1; d <= 30; d++) {
			daySelect.createEl('option', { text: dayNames[d - 1], value: d.toString() });
		}
		daySelect.value = currentDay.toString();

		// 时
		const hourSelect = timeRow.createEl('select');
		hourSelect.setCssProps({ padding: '5px', border: '1px solid #ccc', borderRadius: '0', borderRight: 'none' });
		for (let h = 0; h < 24; h++) {
			hourSelect.createEl('option', { text: h.toString(), value: h.toString() });
		}
		hourSelect.value = currentHour.toString();

		// 分
		const minuteSelect = timeRow.createEl('select');
		minuteSelect.setCssProps({ padding: '5px', border: '1px solid #ccc', borderRadius: '0' });
		for (let m = 0; m < 60; m++) {
			minuteSelect.createEl('option', { text: m.toString(), value: m.toString() });
		}
		minuteSelect.value = currentMinute.toString();
	}

	renderBaziTab(container: Element) {
		// 获取当前公历时间
		const currentData = this.view.currentData;
		const now = new Date();
		const year = currentData?.year ?? now.getFullYear();
		const month = currentData?.month ?? now.getMonth() + 1;
		const day = currentData?.day ?? now.getDate();
		const hour = currentData?.hour ?? now.getHours();

		// 调用paipan.js中的方法计算干支
		const baziResult = this.view.paipan.fatemaps(0, year, month, day, hour, 0, 0);
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
			const selectedYearGan = yearGanSelect.value;
			const selectedYearZhi = yearZhiSelect.value;
			const selectedMonthGan = monthGanSelect.value;
			const selectedMonthZhi = monthZhiSelect.value;
			const selectedDayGan = dayGanSelect.value;
			const selectedDayZhi = dayZhiSelect.value;
			const selectedHourGan = hourGanSelect.value;
			const selectedHourZhi = hourZhiSelect.value;
			const isLateZi = selectedHourZhi === '晚子时';
			const actualHourZhi = isLateZi ? '子' : selectedHourZhi;

			// 清空结果区域
			resultContainer.empty();
			resultContainer.createEl('p', { text: '正在筛选...' });

			// 使用setTimeout避免阻塞UI
			setTimeout(() => {
				try {
					// 调用筛选方法
					const results = this.view.paipan.filterBaziByFourPillars(
						selectedYearGan, selectedYearZhi,
						selectedMonthGan, selectedMonthZhi,
						selectedDayGan, selectedDayZhi,
						selectedHourGan, actualHourZhi,
						isLateZi
					);

					// 清空结果区域
					resultContainer.empty();

					// 显示筛选结果
					if (results.length === 0) {
						resultContainer.createEl('p', { text: '未找到符合条件的日期' });
					} else {
						// // 显示结果数量
						// resultContainer.createEl('p', {
						// 	text: `找到 ${results.length} 个符合条件的日期：`,
						// 	cls: 'result-count'
						// });

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

							// 添加点击事件，点击后仅存储选择的时间
							listItem.addEventListener('click', () => {
								// 存储选中的时间值
								this.selectedYear = result.year;
								this.selectedMonth = result.month;
								this.selectedDay = result.day;
								this.selectedHour = result.hour;
								this.selectedMinute = 0;
								this.selectedSecond = 0;

								// 更新UI显示
								const formattedDate = `${String(result.year).padStart(4, '0')}.${String(result.month).padStart(2, '0')}.${String(result.day).padStart(2, '0')}-${String(result.hour).padStart(2, '0')}.00`;
								listItem.setText(`已选中: ${formattedDate}`);
							});

							// 添加悬停效果
							listItem.setCssProps({
								cursor: 'pointer',
								transition: 'background-color 0.2s'
							});

							listItem.addEventListener('mouseenter', () => {
								listItem.style.backgroundColor = '#f0f0f0';
							});

							listItem.addEventListener('mouseleave', () => {
								listItem.style.backgroundColor = '';
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
}



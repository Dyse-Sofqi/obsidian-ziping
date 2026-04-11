/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { App, Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, ZipingSettings, ZipingSettingTab } from "./settings";
import { BaziView } from './ui/BaziView-simplified';
import { PAIPAN_VIEW_TYPE } from './models/types';
import { Paipan } from './Paipan';
import { initializeStyleUtils } from './utils/styleUtils';

// 导入排盘引擎以初始化 window.p
require('./paipan.js');
import { IdentificationService } from './services/IdentificationService';
import { BaziService } from './services/BaziService';

export default class ZipingPlugin extends Plugin {
	settings: ZipingSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		// 初始化样式工具（style-mod替代setCssProps）
		initializeStyleUtils();

		// 注册侧边栏视图
		this.registerView(PAIPAN_VIEW_TYPE, (leaf) => new BaziView(leaf, this));

		// 添加打开侧边栏视图的命令
		this.addCommand({
			id: 'open-paipan-view',
			name: '打开排盘',
			callback: () => {
				this.activateView();
			}
		});

		// 添加侧边栏排盘图标
		this.addRibbonIcon('calendar', '子平排盘', () => {
			this.activateView();
		});

		// 添加设置标签页
		this.addSettingTab(new ZipingSettingTab(this.app, this));

		// 等待 workspace 完全初始化后再激活视图
		this.app.workspace.onLayoutReady(() => {
			// 如果不存在八字排盘视图，则在右侧侧边栏打开它
			if (this.app.workspace.getLeavesOfType(PAIPAN_VIEW_TYPE).length === 0) {
				this.activateView();
			}
		});
	}

	onunload() {
	}

	async activateView() {
		const { workspace } = this.app;

		// 检查是否已有八字排盘视图的 leaf
		const leaves = workspace.getLeavesOfType(PAIPAN_VIEW_TYPE);
		if (leaves.length > 0) {
			const leaf = leaves[0];
			if (leaf) {
				workspace.revealLeaf(leaf);
				// 刷新数据
				const view = leaf.view as BaziView;
				if (view && view.loadCurrentTime) {
					view.loadCurrentTime();
				}
			}
			return;
		}

		// 在右侧侧边栏创建新 leaf
		const leaf = workspace.getLeaf(false);
		await leaf.setViewState({ type: PAIPAN_VIEW_TYPE, active: true });
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<ZipingSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async saveBaziToFile(title: string, data: any) {
		const basePath = this.settings.casePath || '命例';

		// 根据校时状态选择正确的时间来计算排盘码
		const hour = data.timeCorrectionEnabled && data.bazi.zty ? data.bazi.zty.hour : data.hour;
		const minute = data.timeCorrectionEnabled && data.bazi.zty ? data.bazi.zty.minute : data.minute;

		// 生成排盘码
		const identificationService = new IdentificationService(this.app, new Paipan(), new BaziService(new Paipan()));
		const paiPanCode = identificationService.generatePaiPanCode(
			data.year,
			data.month,
			data.day,
			hour,
			minute,
			data.gender
		);

		// 如果当前title是默认值，则使用排盘码+未命名格式
		const isDefaultTitle = !title || title === '未命名' || title === '命例';
		const fileName = isDefaultTitle ? `${paiPanCode}，未命名.md` : `${title}.md`;
		const filePath = `${basePath}/${fileName}`;

		try {
			// 检查并创建文件夹
			const folder = this.app.vault.getAbstractFileByPath(basePath);
			if (!folder) {
				await this.app.vault.createFolder(basePath);
				new Notice(`已创建文件夹: ${basePath}`);
			}

			// 构建 Markdown 内容
			const content = this.formatBaziToMarkdown(title, data);

			// 保存文件
			await this.app.vault.create(filePath, content);
			new Notice(`已保存到 ${filePath}`);
		} catch (error) {
			new Notice('保存失败: ' + (error as Error).message);
		}
	}

	private formatBaziToMarkdown(title: string, data: any): string {
		const lines: string[] = [];

		// 1. 生成 YAML Frontmatter 格式数据
		const now = new Date();
		const formatDateTime = (date: Date) => {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			const hour = String(date.getHours()).padStart(2, '0');
			const minute = String(date.getMinutes()).padStart(2, '0');
			const second = String(date.getSeconds()).padStart(2, '0');
			return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
		};

		lines.push('---');
		lines.push(`title: "${title || '案例'}"`);
		lines.push(`author: ""`);
		const tagValue = data.tag || '';
		const tagString = tagValue ? `八字/命例/${tagValue}` : '八字/命例';
		lines.push(`tags: [${tagString}]`);
		lines.push(`created: ${formatDateTime(now)}`);
		lines.push(`modified: ${formatDateTime(now)}`);
		lines.push(`aliases: []`);
		lines.push('---');
		lines.push('');

		// 2. 首行生成排盘码，并附带姓名，设置为四级标题 - 根据校时状态使用正确的时间
		const genderCode = data.gender === 0 ? 'Y' : 'X';
		const hour = data.timeCorrectionEnabled && data.bazi.zty ? data.bazi.zty.hour : data.hour;
		const minute = data.timeCorrectionEnabled && data.bazi.zty ? data.bazi.zty.minute : data.minute;
		const paiPanCode = `${String(data.year)}.${String(data.month).padStart(2, '0')}.${String(data.day).padStart(2, '0')}-${String(hour).padStart(2, '0')}.${String(minute).padStart(2, '0')}-${genderCode}`;
		lines.push(`#### ${paiPanCode}，${data.name || '案例'}`);
		lines.push('');

		// 3. 使用Paipan类获取十神，确保与BaziView.ts中显示一致
		const paipan = new Paipan();
		const riZhuGan = data.bazi.gztg[2];

		// 获取完整十神名称
		const nianGanShiShenFull = paipan.getShiShenFull(riZhuGan, data.bazi.gztg[0]);
		const yueGanShiShenFull = paipan.getShiShenFull(riZhuGan, data.bazi.gztg[1]);
		const shiGanShiShenFull = paipan.getShiShenFull(riZhuGan, data.bazi.gztg[3]);

		// 转换为简写
		const nianGanShiShen = this.getShiShenShortFromFull(nianGanShiShenFull);
		const yueGanShiShen = this.getShiShenShortFromFull(yueGanShiShenFull);
		const shiGanShiShen = this.getShiShenShortFromFull(shiGanShiShenFull);

		// 5. 展示十神简写
		lines.push(`${nianGanShiShen}${yueGanShiShen}〇${shiGanShiShen}`);

		// 6. 展示天干
		lines.push(`${data.bazi.gztg[0]}${data.bazi.gztg[1]}${data.bazi.gztg[2]}${data.bazi.gztg[3]}`);

		// 7. 展示地支
		lines.push(`${data.bazi.dz[0]}${data.bazi.dz[1]}${data.bazi.dz[2]}${data.bazi.dz[3]}`);

		// 8. 展示九部大运干支
		const dayunItems = data.dayun.allDayun.slice(0, 9) as any[];

		lines.push('');
		// 9. 生成大运列表，每行展示一个大运的起始年份和干支和岁数
		for (const dayun of dayunItems) {
			lines.push(`- ${dayun.startYear}${dayun.gan}${dayun.zhi}年${dayun.age}岁`);
		}
		lines.push('');

		return lines.join('\n');
	}

	// 从完整十神名称获取简写
	private getShiShenShortFromFull(shiShenFull: string): string {
		const shiShenMap: Record<string, string> = {
			'比肩': '比', '劫财': '劫', '食神': '食', '伤官': '伤',
			'偏财': '才', '正财': '财', '七杀': '杀', '偏官': '杀', '正官': '官',
			'偏印': '枭', '正印': '印'
		};

		return shiShenMap[shiShenFull] || '';
	}

	// 获取十神简写（保持向后兼容性，但建议使用getShiShenShortFromFull）
	private getShiShenShort(riGan: string, gan: string): string {
		const paipan = new Paipan();
		const shiShenFull = paipan.getShiShenFull(riGan, gan);
		return this.getShiShenShortFromFull(shiShenFull);
	}
}

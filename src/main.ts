import {App, Notice, Plugin, WorkspaceLeaf} from 'obsidian';
import {DEFAULT_SETTINGS, ZipingSettings, ZipingSettingTab} from "./settings";
import { BaziView, PAIPAN_VIEW_TYPE } from './BaziView';

// 导入排盘引擎以初始化 window.p
require('./paipan.js');

export default class ZipingPlugin extends Plugin {
	settings: ZipingSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		// 注册侧边栏视图
		this.registerView(PAIPAN_VIEW_TYPE, (leaf) => new BaziView(leaf, this));

		// 添加打开侧边栏视图的命令
		this.addCommand({
			id: 'open-paipan-view',
			name: '打开八字排盘',
			callback: () => {
				this.activateView();
			}
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
		const fileName = `${title || '命例'}.md`;
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
		lines.push('tags: [八字,命例]');
		lines.push(`created: ${formatDateTime(now)}`);
		lines.push(`modified: ${formatDateTime(now)}`);
		lines.push(`aliases: []`);
		lines.push('---');
		lines.push('');

		// 2. 首行生成排盘码，并附带姓名，设置为四级标题
		const genderCode = data.gender === 0 ? 'Y' : 'X';
		const paiPanCode = `${String(data.year)}.${String(data.month).padStart(2, '0')}.${String(data.day).padStart(2, '0')}-${String(data.hour).padStart(2, '0')}.${String(data.minute).padStart(2, '0')}-${genderCode}`;
		lines.push(`#### ${paiPanCode}，${data.name || '案例'}`);

		// 5. 第四行展示十神简写
		const riZhuGan = data.bazi.gztg[2];
		const nianGanShiShen = this.getShiShenShort(riZhuGan, data.bazi.gztg[0]);
		const yueGanShiShen = this.getShiShenShort(riZhuGan, data.bazi.gztg[1]);
		const shiGanShiShen = this.getShiShenShort(riZhuGan, data.bazi.gztg[3]);
		lines.push(`${nianGanShiShen}${yueGanShiShen}〇${shiGanShiShen}`);

		// 6. 第五行展示天干
		lines.push(`${data.bazi.gztg[0]}${data.bazi.gztg[1]}${data.bazi.gztg[2]}${data.bazi.gztg[3]}`);

		// 7. 第六行展示地支
		lines.push(`${data.bazi.dz[0]}${data.bazi.dz[1]}${data.bazi.dz[2]}${data.bazi.dz[3]}`);

		// 8. 第七行展示九部大运干支
		const dayunGanZhi = data.dayun.allDayun.slice(0, 9).map((dy: any) => `${dy.gan}${dy.zhi}`).join('、');
		lines.push(`大运：${dayunGanZhi}`);

		return lines.join('\n');
	}

	// 获取十神简写
	private getShiShenShort(riGan: string, gan: string): string {
		const shiShenMap: Record<string, string> = {
			'比肩': '比', '劫财': '劫', '食神': '食', '伤官': '伤',
			'偏财': '才', '正财': '财', '七杀': '杀', '正官': '官',
			'偏印': '枭', '正印': '印'
		};

		// 获取完整十神名称
		const wuXing = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
		const wuXingIndex = wuXing.indexOf(riGan);
		const ganIndex = wuXing.indexOf(gan);

		if (wuXingIndex === -1 || ganIndex === -1) return '';

		// 计算十神关系
		const diff = (ganIndex - wuXingIndex + 10) % 10;
		const shiShenFullArray = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'];
		const shiShenFull = shiShenFullArray[diff];

		if (!shiShenFull) return '';

		return shiShenMap[shiShenFull] || '';
	}
}

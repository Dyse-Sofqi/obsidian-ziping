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

		// 如果不存在八字排盘视图，则在右侧侧边栏打开它
		if (this.app.workspace.getLeavesOfType(PAIPAN_VIEW_TYPE).length === 0) {
			await this.activateView();
		}
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
		lines.push(`# ${title || '命例'}`);
		lines.push('');
		lines.push(`## 基本信息`);
		lines.push(`- 出生时间: ${data.year}年${data.month}月${data.day}日 ${data.hour}:${data.minute}:${data.second}`);
		lines.push(`- 性别: ${data.gender === 1 ? '男' : '女'}`);
		lines.push('');
		lines.push('');
		if (data.solarTerms) {
			lines.push(`## 节气`);
			lines.push(`- 前节气: ${data.solarTerms.prev || ''}`);
			lines.push(`- 后节气: ${data.solarTerms.next || ''}`);
		}
		return lines.join('\n');
	}
}

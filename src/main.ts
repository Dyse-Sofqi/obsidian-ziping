import {App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, ZipingSettings, ZipingSettingTab} from "./settings";

// 记住重命名这些类和接口！

export default class ZipingPlugin extends Plugin {
	settings: ZipingSettings;

	async onload() {
		await this.loadSettings();

		// 这在左边栏中创建一个图标。
		this.addRibbonIcon('dice', 'Sample', (evt: MouseEvent) => {
			// 用户单击图标时调用。
			new Notice('This is a notice!');
		});

		// 这在应用底部添加状态栏项。在移动应用上不起作用。
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status bar text');

		// 这添加一个可以在任何地方触发的简单命令
		this.addCommand({
			id: 'open-modal-simple',
			name: 'Open modal (simple)',
			callback: () => {
				new ZipingModal(this.app).open();
			}
		});
		// 这添加一个编辑器命令，可以对当前编辑器实例执行某些操作
		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('Sample editor command');
			}
		});
		// 这添加一个复杂命令，可以检查应用的当前状态是否允许执行该命令
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// 要检查的条件
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// 如果检查为真，我们只是在"检查"是否可以运行该命令。
					// 如果检查为假，那么我们要实际执行操作。
					if (!checking) {
						new ZipingModal(this.app).open();
					}

					// 当检查函数返回真时，此命令才会在命令面板中显示
					return true;
				}
				return false;
			}
		});

		// 这添加一个设置标签页，以便用户可以配置插件的各个方面
		this.addSettingTab(new ZipingSettingTab(this.app, this));

		// 如果插件连接任何全局 DOM 事件（在不属于此插件的应用部分上）
		// 使用此函数将在禁用此插件时自动删除事件侦听器。
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			new Notice("Click");
		});

		// 注册间隔时，此函数将在禁用此插件时自动清除间隔。
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<ZipingSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ZipingModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

import {App, PluginSettingTab, Setting} from "obsidian";
import ZipingPlugin from "./main";

export interface ZipingSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: ZipingSettings = {
	mySetting: 'default'
}

export class ZipingSettingTab extends PluginSettingTab {
	plugin: ZipingPlugin;

	constructor(app: App, plugin: ZipingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

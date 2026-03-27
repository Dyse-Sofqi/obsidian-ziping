import {App, PluginSettingTab, Setting} from "obsidian";
import ZipingPlugin from "./main";

// 城市经纬度数据
export interface CityData {
	name: string;
	longitude: number;
	latitude: number;
}

export const CITIES: CityData[] = [
	{ name: '北京', longitude: 116.46, latitude: 39.92 },
	{ name: '上海', longitude: 121.48, latitude: 31.22 },
	{ name: '天津', longitude: 117.2, latitude: 39.12 },
	{ name: '重庆', longitude: 106.54, latitude: 29.59 },
	{ name: '哈尔滨', longitude: 126.63, latitude: 45.75 },
	{ name: '长春', longitude: 125.35, latitude: 43.88 },
	{ name: '沈阳', longitude: 123.38, latitude: 41.8 },
	{ name: '石家庄', longitude: 114.48, latitude: 38.03 },
	{ name: '太原', longitude: 112.53, latitude: 37.87 },
	{ name: '呼和浩特', longitude: 111.65, latitude: 40.82 },
	{ name: '南京', longitude: 118.78, latitude: 32.04 },
	{ name: '杭州', longitude: 120.19, latitude: 30.26 },
	{ name: '合肥', longitude: 117.27, latitude: 31.86 },
	{ name: '福州', longitude: 119.3, latitude: 26.08 },
	{ name: '南昌', longitude: 115.89, latitude: 28.68 },
	{ name: '济南', longitude: 117.0, latitude: 36.65 },
	{ name: '郑州', longitude: 113.62, latitude: 34.76 },
	{ name: '武汉', longitude: 114.31, latitude: 30.52 },
	{ name: '长沙', longitude: 113.0, latitude: 28.21 },
	{ name: '广州', longitude: 113.23, latitude: 23.16 },
	{ name: '南宁', longitude: 108.33, latitude: 22.84 },
	{ name: '成都', longitude: 104.06, latitude: 30.67 },
	{ name: '贵阳', longitude: 106.71, latitude: 26.57 },
	{ name: '昆明', longitude: 102.73, latitude: 25.04 },
	{ name: '拉萨', longitude: 91.11, latitude: 29.65 },
	{ name: '西安', longitude: 108.95, latitude: 34.27 },
	{ name: '兰州', longitude: 103.73, latitude: 36.03 },
	{ name: '西宁', longitude: 101.74, latitude: 36.56 },
	{ name: '银川', longitude: 106.27, latitude: 38.47 },
	{ name: '乌鲁木齐', longitude: 87.68, latitude: 43.77 },
	{ name: '香港', longitude: 114.17, latitude: 22.28 },
	{ name: '澳门', longitude: 113.55, latitude: 22.2 },
	{ name: '台北', longitude: 121.5, latitude: 25.05 },
	{ name: '海口', longitude: 110.35, latitude: 20.02 },
	{ name: '三亚', longitude: 109.31, latitude: 18.25 },
	{ name: '深圳', longitude: 114.07, latitude: 22.62 },
	{ name: '宁波', longitude: 121.56, latitude: 29.86 },
	{ name: '青岛', longitude: 120.38, latitude: 36.07 },
	{ name: '大连', longitude: 121.62, latitude: 38.92 },
	{ name: '厦门', longitude: 118.1, latitude: 24.46 },
	{ name: '苏州', longitude: 120.58, latitude: 31.3 },
	{ name: '无锡', longitude: 120.29, latitude: 31.49 },
	{ name: '佛山', longitude: 113.12, latitude: 23.02 },
	{ name: '东莞', longitude: 113.75, latitude: 23.04 },
	{ name: '温州', longitude: 120.67, latitude: 28.0 },
	{ name: '绍兴', longitude: 120.58, latitude: 30.0 },
	{ name: '嘉兴', longitude: 120.76, latitude: 30.74 },
	{ name: '金华', longitude: 119.64, latitude: 29.08 },
	{ name: '徐州', longitude: 117.18, latitude: 34.26 },
	{ name: '扬州', longitude: 119.43, latitude: 32.39 }
];

export interface ZipingSettings {
	mySetting: string;
	longitude: string;
	latitude: string;
	casePath: string; // 案例保存路径
	city: string; // 当前选择的城市
}

export const DEFAULT_SETTINGS: ZipingSettings = {
	mySetting: 'default',
	longitude: '120',
	latitude: '35',
	casePath: '命例',
	city: '杭州'
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

		new Setting(containerEl)
			.setHeading()
			.setName('Paipan calendar settings');

		new Setting(containerEl)
			.setName('Longitude')
			.setDesc('经度 (东经为正)')
			.addText(text => text
				.setPlaceholder('120')
				.setValue(this.plugin.settings.longitude)
				.onChange(async (value) => {
					this.plugin.settings.longitude = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Latitude')
			.setDesc('纬度 (北纬为正)')
			.addText(text => text
				.setPlaceholder('35')
				.setValue(this.plugin.settings.latitude)
				.onChange(async (value) => {
					this.plugin.settings.latitude = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Case save path')
			.setDesc('案例保存路径 (默认: 命例)')
			.addText(text => text
				.setPlaceholder('命例')
				.setValue(this.plugin.settings.casePath)
				.onChange(async (value) => {
					this.plugin.settings.casePath = value || '命例';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('City')
			.setDesc('选择城市用于计算真太阳时')
			.addDropdown(dropdown => {
				CITIES.forEach(city => {
					dropdown.addOption(city.name, city.name);
				});
				dropdown.setValue(this.plugin.settings.city || '杭州');
				dropdown.onChange(async (value) => {
					this.plugin.settings.city = value;
					// 根据城市更新经纬度
					const cityData = CITIES.find(c => c.name === value);
					if (cityData) {
						this.plugin.settings.longitude = cityData.longitude.toString();
						this.plugin.settings.latitude = cityData.latitude.toString();
					}
					await this.plugin.saveSettings();
				});
			});
	}
}

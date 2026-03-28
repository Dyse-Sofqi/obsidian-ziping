import {App, PluginSettingTab, Setting} from "obsidian";
import ZipingPlugin from "./main";
import cityData from "./city.json";

// 城市经纬度数据
export interface CityData {
	name: string;
	longitude: number;
	latitude: number;
}

// city.json 的数据类型
interface CityJsonItem {
	id: number;
	pid: number;
	name: string;
	j: number;
	w: number;
}

// 省份数据类型
export interface ProvinceData {
	name: string;
	id: number;
}

// 省份-城市分组
export interface ProvinceCityGroup {
	province: ProvinceData;
	cities: CityData[];
}

// 从 city.json 加载并筛选城市数据
function loadCities(): CityData[] {
	const cities: CityData[] = [];

	// 1. 添加直辖市 (pid=0 且 name 以"市"结尾)
	const municipalities = cityData.filter(
		(c: CityJsonItem) => c.pid === 0 && c.name.endsWith("市")
	);
	municipalities.forEach((c: CityJsonItem) => {
		cities.push({
			name: c.name.replace("市", ""),
			longitude: c.j,
			latitude: c.w
		});
	});

	// 2. 添加香港、澳门 (特殊行政区)
	const specialRegions = cityData.filter(
		(c: CityJsonItem) => c.name.includes("香港") || c.name.includes("澳门")
	);
	specialRegions.forEach((c: CityJsonItem) => {
		cities.push({
			name: c.name.replace("特别行政区", "").replace("澳门", "澳门").replace("香港", "香港"),
			longitude: c.j,
			latitude: c.w
		});
	});

	// 3. 添加地级市 (pid > 0 且 name 以"市"结尾)
	const prefectureCities = cityData.filter(
		(c: CityJsonItem) => c.pid > 0 && c.name.endsWith("市")
	);
	prefectureCities.forEach((c: CityJsonItem) => {
		cities.push({
			name: c.name.replace("市", ""),
			longitude: c.j,
			latitude: c.w
		});
	});

	// 4. 按名称去重
	const seen = new Set<string>();
	const uniqueCities: CityData[] = [];
	for (const city of cities) {
		if (!seen.has(city.name)) {
			seen.add(city.name);
			uniqueCities.push(city);
		}
	}

	// 5. 按名称排序
	uniqueCities.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

	return uniqueCities;
}

// 加载省份分组数据（用于两级联动选择器）
function loadProvinceCityGroups(): ProvinceCityGroup[] {
	const groups: ProvinceCityGroup[] = [];

	// 1. 获取所有省份 (pid=0 且不是直辖市)
	const provinces = cityData.filter(
		(c: CityJsonItem) => c.pid === 0 && !c.name.endsWith("市")
	);

	// 2. 为每个省份添加其地级市
	provinces.forEach((province: CityJsonItem) => {
		const citiesInProvince = cityData.filter(
			(c: CityJsonItem) => c.pid === province.id && c.name.endsWith("市")
		);

		const cities: CityData[] = citiesInProvince.map((c: CityJsonItem) => ({
			name: c.name.replace("市", ""),
			longitude: c.j,
			latitude: c.w
		}));

		// 按名称排序
		cities.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

		groups.push({
			province: { name: province.name, id: province.id },
			cities
		});
	});

	// 3. 添加直辖市作为单独的组
	const municipalities = cityData.filter(
		(c: CityJsonItem) => c.pid === 0 && c.name.endsWith("市")
	);
	municipalities.forEach((c: CityJsonItem) => {
		groups.unshift({
			province: { name: c.name.replace("市", ""), id: c.id },
			cities: [{
				name: c.name.replace("市", ""),
				longitude: c.j,
				latitude: c.w
			}]
		});
	});

	// 4. 添加香港、澳门
	const specialRegions = cityData.filter(
		(c: CityJsonItem) => c.name.includes("香港") || c.name.includes("澳门")
	);
	specialRegions.forEach((c: CityJsonItem) => {
		groups.push({
			province: { name: c.name.replace("特别行政区", ""), id: c.id },
			cities: [{
				name: c.name.replace("特别行政区", ""),
				longitude: c.j,
				latitude: c.w
			}]
		});
	});

	return groups;
}

export const CITIES: CityData[] = loadCities();
export const PROVINCE_CITY_GROUPS: ProvinceCityGroup[] = loadProvinceCityGroups();

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

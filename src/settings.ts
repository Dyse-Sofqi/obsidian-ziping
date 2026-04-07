import {App, PluginSettingTab, Setting} from "obsidian";
import ZipingPlugin from "./main";
import cityData from "./city.json";

// 城市经纬度数据
export interface CityData {
	name: string;
	longitude: number;
	latitude: number;
	fullName?: string; // 完整名称（用于区分同名地区）
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

// 地级市数据类型
export interface CityLevelData {
	name: string;
	id: number;
	provinceId: number;
}

// 区县数据类型
export interface DistrictData {
	name: string;
	id: number;
	cityId: number;
	longitude: number;
	latitude: number;
}

// 省份-地级市-区县三级分组
export interface ProvinceCityDistrictGroup {
	province: ProvinceData;
	cities: CityLevelData[];
	districts: Map<number, DistrictData[]>; // key: cityId, value: 对应的区县列表
}

// 保留原有的省份-城市分组（用于向后兼容）
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
			latitude: c.w,
			fullName: c.name
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
			latitude: c.w,
			fullName: c.name
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
			latitude: c.w,
			fullName: c.name
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

// 加载三级行政区划数据
function loadProvinceCityDistrictGroups(): ProvinceCityDistrictGroup[] {
	const groups: ProvinceCityDistrictGroup[] = [];

	// 1. 获取所有省份 (pid=0)
	const provinces = cityData.filter((c: CityJsonItem) => c.pid === 0);

	// 2. 为每个省份处理
	provinces.forEach((province: CityJsonItem) => {
		const provinceGroup: ProvinceCityDistrictGroup = {
			province: { name: province.name, id: province.id },
			cities: [],
			districts: new Map()
		};

		// 获取该省份下的地级市 (pid=省份id)
		const citiesInProvince = cityData.filter(
			(c: CityJsonItem) => c.pid === province.id
		);

		// 处理每个地级市
		citiesInProvince.forEach((cityItem: CityJsonItem) => {
			// 添加地级市
			provinceGroup.cities.push({
				name: cityItem.name,
				id: cityItem.id,
				provinceId: province.id
			});

			// 获取该地级市下的区县 (pid=地级市id)
			const districtsInCity = cityData.filter(
				(c: CityJsonItem) => c.pid === cityItem.id
			);

			// 转换区县数据
			const districts: DistrictData[] = districtsInCity.map((district: CityJsonItem) => ({
				name: district.name,
				id: district.id,
				cityId: cityItem.id,
				longitude: district.j,
				latitude: district.w
			}));

			// 按名称排序
			districts.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

			// 添加到地图中
			provinceGroup.districts.set(cityItem.id, districts);
		});

		// 按城市名称排序
		provinceGroup.cities.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

		groups.push(provinceGroup);
	});

	return groups;
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

// 三级联动数据结构
export const PROVINCE_CITY_DISTRICT_GROUPS: ProvinceCityDistrictGroup[] = loadProvinceCityDistrictGroups();

export interface ZipingSettings {
	mySetting: string;
	casePath: string; // 案例保存路径
}

export const DEFAULT_SETTINGS: ZipingSettings = {
	mySetting: 'default',
	casePath: '命例'
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
			.setHeading()
			.setName('Paipan calendar settings');



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

	}
}

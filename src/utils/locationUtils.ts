// 地理位置工具函数
import { CITIES, PROVINCE_CITY_GROUPS, PROVINCE_CITY_DISTRICT_GROUPS } from '../settings';

/**
 * 根据区县名称查找完整的地理信息数据
 * 从BaziView.ts中的findLocationData方法提取
 */
export function findLocationData(districtName: string, cityName: string, provinceName: string): { longitude: number, latitude: number } | null {
    // 如果没有区县名称，尝试使用城市名称
    if (!districtName && !cityName && !provinceName) {
        return null;
    }

    // 搜索三级联动数据结构
    for (const group of PROVINCE_CITY_DISTRICT_GROUPS) {
        // 检查省份名称是否匹配（如果提供了省份）
        if (provinceName && group.province.name !== provinceName) {
            continue;
        }

        // 在城市的区县中查找
        for (const city of group.cities) {
            // 检查城市名称是否匹配（如果提供了城市）
            if (cityName && city.name !== cityName) {
                continue;
            }

            // 查找对应的区县
            const districts = group.districts.get(city.id);
            if (districts) {
                for (const district of districts) {
                    if (district.name === districtName || (!districtName && city.name === cityName)) {
                        // 返回找到的经纬度数据
                        return {
                            longitude: district.longitude,
                            latitude: district.latitude
                        };
                    }
                }
            } else if (!districtName && cityName && city.name === cityName) {
                // 如果没有区县数据但城市匹配，使用城市的中心坐标（如果可用）
                // 这里需要从原CITIES数组中查找
                const cityData = CITIES.find(c => c.name === cityName);
                if (cityData) {
                    return {
                        longitude: cityData.longitude,
                        latitude: cityData.latitude
                    };
                }
            }
        }
    }

    // 如果没有找到区县数据，尝试从原CITIES数组查找城市
    if (cityName && !districtName) {
        const cityData = CITIES.find(c => c.name === cityName);
        if (cityData) {
            return {
                longitude: cityData.longitude,
                latitude: cityData.latitude
            };
        }
    }

    return null;
}

/**
 * 在三级联动数据中查找地理位置信息
 * 从BaziView.ts中的findLocationInGroups方法提取
 */
export function findLocationInGroups(districtName: string, cityName: string, provinceName: string): { longitude: number; latitude: number; } | null {
    if (!districtName || !cityName || !provinceName) return null;

    // 遍历省份-城市-区县数据
    for (const group of PROVINCE_CITY_DISTRICT_GROUPS) {
        if (group.province.name === provinceName) {
            // 找到对应省份，寻找城市
            const city = group.cities.find(c => c.name === cityName);
            if (city) {
                // 找到对应城市，寻找区县
                const districts = group.districts.get(city.id);
                if (districts && districts.length > 0) {
                    const district = districts.find(d => d.name === districtName);
                    if (district) {
                        return {
                            longitude: district.longitude,
                            latitude: district.latitude
                        };
                    }
                }
            }
        }
    }

    return null;
}
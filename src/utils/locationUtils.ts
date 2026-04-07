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

    console.debug('查找地理位置:', { provinceName, cityName, districtName });

    // 遍历省份-城市-区县数据
    for (const group of PROVINCE_CITY_DISTRICT_GROUPS) {
        // 省份匹配：去除可能的"省"、"市"后缀进行模糊匹配
        let matchedProvince = group.province.name;
        const normalizedProvinceName = provinceName.replace(/省|市|特别行政区/g, '');
        const normalizedGroupProvince = matchedProvince.replace(/省|市|特别行政区/g, '');
        
        if (normalizedGroupProvince === normalizedProvinceName) {
            // 找到对应省份，寻找城市
            for (const city of group.cities) {
                // 城市匹配：去除可能的"市"后缀进行模糊匹配
                const normalizedCityName = cityName.replace(/市/g, '');
                const normalizedGroupCity = city.name.replace(/市/g, '');
                
                if (normalizedGroupCity === normalizedCityName || city.name.includes(cityName) || cityName.includes(city.name)) {
                    // 找到对应城市，寻找区县
                    const districts = group.districts.get(city.id);
                    if (districts && districts.length > 0) {
                        // 精确匹配优先
                        let district = districts.find(d => d.name === districtName);
                        if (!district) {
                            // 模糊匹配：包含关系
                            district = districts.find(d => 
                                d.name.includes(districtName) || 
                                districtName.includes(d.name) ||
                                d.name.replace(/区|县|市/g, '') === districtName.replace(/区|县|市/g, '')
                            );
                        }
                        
                        if (district) {
                            console.debug('找到匹配的地理位置:', { 
                                省份: group.province.name, 
                                城市: city.name, 
                                区县: district.name,
                                经度: district.longitude,
                                纬度: district.latitude
                            });
                            return {
                                longitude: district.longitude,
                                latitude: district.latitude
                            };
                        }
                    }
                    
                    // 如果区县找不到，返回城市的经纬度作为回退
                    console.debug('区县未找到，使用城市经纬度回退:', { 
                        省份: group.province.name, 
                        城市: city.name,
                        经度: city.longitude,
                        纬度: city.latitude
                    });
                    return {
                        longitude: city.longitude,
                        latitude: city.latitude
                    };
                }
            }
        }
    }

    console.debug('地理位置查找失败，未找到匹配项');
    return null;
}
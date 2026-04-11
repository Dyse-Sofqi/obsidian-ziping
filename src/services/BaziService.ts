/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// 八字计算和显示服务
import { Paipan } from '../Paipan';
import { CurrentBaziData, BaziResult, CurrentDayunData, NearbySolarTerms, DayunItem, LiuyueItem } from '../models/types';

export class BaziService {
    private paipan: Paipan;

    constructor(paipan: Paipan) {
        this.paipan = paipan;
    }

    // 计算八字
    async calculateBazi(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        second: number,
        gender: number,
        name: string,
        timeCorrectionEnabled: boolean,
        tag: string,
        existingData?: CurrentBaziData | null
    ): Promise<CurrentBaziData> {
        // 如果有现有的地理位置信息，应用到 Paipan 引擎中
        if (existingData && existingData.longitude && existingData.latitude) {
            this.paipan.J = existingData.longitude;
            this.paipan.W = existingData.latitude;
        }

        // 使用排盘引擎计算八字（获取完整结果）
        // 改用Paipan的fatemaps方法，确保参数验证逻辑一致
        const baziResult = this.paipan.fatemaps(
            gender,
            year,
            month,
            day,
            hour,
            minute,
            second,
            timeCorrectionEnabled ? this.paipan.J : undefined,
            timeCorrectionEnabled ? this.paipan.W : undefined
        );

        // 获取当前节气信息、计算大运流年
        const solarTerms = this.getNearbySolarTerms(year, month, day);
        const dayunData = this.calculateDayun(gender, year, month, day, hour);

        // 确定当前大运索引
        const currentYear = new Date().getFullYear();
        let selectedDayunIndex = 0;
        let selectedLiunianIndex = 0;
        
        // 找到包含当前年份的大运
        if (dayunData.allDayun && dayunData.allDayun.length > 0) {
            // 计算出生年份
            const birthYear = year;
            
            // 寻找当前年份所在的大运
            for (let i = 0; i < dayunData.allDayun.length; i++) {
                const dy = dayunData.allDayun[i];
                if (dy && dy.startYear <= currentYear) {
                    // 当前大运索引
                    selectedDayunIndex = i;
                    // 计算在当前大运中的流年索引（从大运开始年份算起）
                    selectedLiunianIndex = Math.max(0, currentYear - dy.startYear);
                }
            }
            
            // 如果没有找到包含当前年份的大运（说明还未起运），则设置为小运模式
            const firstDayun = dayunData.allDayun[0];
            if (firstDayun && currentYear < birthYear + firstDayun.age) {
                selectedDayunIndex = -1; // -1表示小运模式
                selectedLiunianIndex = Math.max(0, currentYear - birthYear);
            }
        }

	// 计算流月数据 - 根据选中的流年计算
	let liuyue: LiuyueItem[] = [];
	let selectedLiuyueIndex = 0; // 默认选中第一个流月
	
	try {
		// 根据选中的流年计算流月
		const liunianYear = this.calculateLiunianYear(year, selectedDayunIndex, selectedLiunianIndex, dayunData.allDayun);
		
		// 调用Paipan的流月计算函数
		const rawResult = this.paipan.calculateLiuyue(baziResult, liunianYear);
		
		if (Array.isArray(rawResult)) {
			liuyue = rawResult;
			
				// 自动选择当前流月（如果流月数据有效）
			if (liuyue.length > 0) {
				try {
					selectedLiuyueIndex = this.calculateCurrentLiuyueIndex(liuyue);
				} catch (error) {
					selectedLiuyueIndex = 0;
				}
			}
		}
	} catch (error) {
		// 返回空流月数组，不影响主要功能
	}

        // 构建当前八字数据，包含地理位置信息
        const currentData: CurrentBaziData = {
            year,
            month,
            day,
            hour,
            minute,
            second,
            amOrPm: hour >= 12 ? '下午' : '上午',
            gender,
            name,
            bazi: baziResult,
            solarTerms,
            dayun: dayunData,
            selectedDayunIndex,
            selectedLiunianIndex,
            selectedLiuyueIndex: 0, // 默认选中第一个流月
			liuyue, // 流月数据
			timeCorrectionEnabled,
			tag
		};

		// 更新流月选中索引
		currentData.selectedLiuyueIndex = selectedLiuyueIndex;

		// 保留现有的地理位置信息
		if (existingData) {
			currentData.province = existingData.province;
			currentData.city = existingData.city;
			currentData.district = existingData.district;
			currentData.longitude = existingData.longitude;
			currentData.latitude = existingData.latitude;
		}

        return currentData;
    }

	// 计算当前流月索引
	private calculateCurrentLiuyueIndex(liuyue: LiuyueItem[]): number {
		if (!liuyue || liuyue.length === 0) {
			console.warn('流月数据为空，无法计算当前流月索引');
			return 0;
		}

		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();
		
		try {
			// 使用Paipan引擎计算精确的节气日期
			const solarTermsResult = this.paipan.getNearbySolarTerms(currentYear, 1, 1);
			
			if (!solarTermsResult || !solarTermsResult.previous || !solarTermsResult.next) {
				throw new Error('无法获取当前年度的节气信息');
			}
			
			// 找到包含当前日期的流月区间
			for (let i = 0; i < liuyue.length - 1; i++) {
				const currentLiuyue = liuyue[i];
				const nextLiuyue = liuyue[i + 1];
				
				if (!currentLiuyue || !nextLiuyue || !currentLiuyue.name || !nextLiuyue.name) {
					throw new Error(`流月数据不完整: 当前流月=${currentLiuyue?.name}, 下一流月=${nextLiuyue?.name}`);
				}
				
				// 获取精确的节气时间点
				const currentJieqiExact = this.getExactJieqiTime(currentYear, currentLiuyue.name, solarTermsResult);
				const nextJieqiExact = this.getExactJieqiTime(currentYear, nextLiuyue.name, solarTermsResult);
				
				if (!currentJieqiExact || !nextJieqiExact) {
					throw new Error(`无法确定节气时间: ${currentLiuyue.name} 或 ${nextLiuyue.name}`);
				}
				
				// 检查当前日期是否在此流月区间内
				if (currentDate >= currentJieqiExact && currentDate < nextJieqiExact) {
					return i;
				}
			}
			
			// 如果没找到匹配的流月，抛出明确的错误
			throw new Error(`当前日期 ${currentDate.toISOString().split('T')[0]} 不在任何流月区间内`);
			
		} catch (error) {
			console.error('计算当前流月索引失败:', error);
			// 在开发环境下抛出错误以便调试，生产环境下返回默认值
			if (process.env.NODE_ENV === 'development') {
				throw new Error(`流月索引计算错误: ${error instanceof Error ? error.message : error}`);
			}
			// 生产环境返回默认值，但记录详细错误
			return 0;
		}
	}

	// 获取精确的节气时间
	private getExactJieqiTime(year: number, jieqiName: string, solarTermsResult: any): Date | null {
		try {
			// 使用Paipan类中已有的节气计算方法
			if (!this.paipan) {
				console.error('排盘对象未初始化');
				return null;
			}
			
			// 获取当前年份的所有干支月节气
			const ganzhiTerms = this.paipan.getGanzhiMonthSolarTerms(year);
			
			// 查找指定的节气
			const targetTerm = ganzhiTerms.find(term => term.name === jieqiName);
			if (!targetTerm) {
				console.warn(`无法找到 ${year} 年的 ${jieqiName} 节气`);
				return null;
			}
			
			return targetTerm.date;
		} catch (error) {
			console.error(`获取节气 ${jieqiName} 精确时间失败:`, error);
			// 备用方案：使用Paipan类的getGanzhiMonthNearbySolarTerms方法
			try {
				const nearbyTerms = this.paipan.getGanzhiMonthNearbySolarTerms(year, 1, 1);
				
				// 遍历附近节气查找目标节气
				if (nearbyTerms.previous && nearbyTerms.previous.name === jieqiName) {
					return nearbyTerms.previous.date;
				}
				if (nearbyTerms.next && nearbyTerms.next.name === jieqiName) {
					return nearbyTerms.next.date;
				}
				
				console.warn(`备用方案也未找到 ${jieqiName} 节气`);
				return null;
			} catch (fallbackError) {
				console.error(`备用方案也失败:`, fallbackError);
				return null;
			}
		}
	}

	// 根据选中信息计算流年
	private calculateLiunianYear(birthYear: number, selectedDayunIndex: number, selectedLiunianIndex: number, allDayun: any[]): number {
        // 小运模式：直接使用出生年份加偏移
        if (selectedDayunIndex === -1) {
            return birthYear + selectedLiunianIndex;
        }
        
        // 正常大运模式：需要根据选中大运的起始年份计算
        const dayunCount = allDayun ? allDayun.length : 0;
        
        // 确保索引在有效范围内
        if (selectedDayunIndex >= 0 && selectedDayunIndex < dayunCount) {
            const selectedDayun = allDayun[selectedDayunIndex];
            if (selectedDayun && selectedDayun.startYear) {
                // 流年 = 大运起始年份 + 流年索引
                return selectedDayun.startYear + selectedLiunianIndex;
            }
        }
        
    // 默认返回出生年份，防止计算错误
    console.warn('无法计算流年，使用出生年份作为回退:', birthYear);
    return birthYear;
    }

    // 获取干支月节令信息（用于八字显示）
    private getNearbySolarTerms(year: number, month: number, day: number): NearbySolarTerms {
        try {
            return this.paipan.getGanzhiMonthNearbySolarTerms(year, month, day);
        } catch (error) {
            console.error('获取干支月节令失败:', error);
            // 如果干支月节令获取失败，回退到普通节气获取
            try {
                return this.paipan.getNearbySolarTerms(year, month, day);
            } catch (fallbackError) {
                console.error('获取节气也失败:', fallbackError);
                return {
                    previous: null,
                    next: null,
                    interval: null
                };
            }
        }
    }

    // 保留原始节气获取方法（用于内部计算）
    private getStandardNearbySolarTerms(year: number, month: number, day: number): NearbySolarTerms {
        try {
            return this.paipan.getNearbySolarTerms(year, month, day);
        } catch (error) {
            console.error('获取标准节气失败:', error);
            return {
                previous: null,
                next: null,
                interval: null
            };
        }
    }

    // 计算大运流年
    private calculateDayun(
        gender: number,
        year: number,
        month: number,
        day: number,
        hour: number
    ): CurrentDayunData {
        try {
            // 直接调用Paipan的getCurrentDayun方法，底层引擎会重新计算完整结果
            const dayunData = this.paipan.getCurrentDayun(year, month, day, gender, hour);
            
            // 计算交运日期描述
            if (dayunData.qyy_desc2) {
                const { jiaoyunDateDesc, jiaoyunDetailDesc } = this.paipan.calculateJiaoyunDateDesc(
                    year, month, day, dayunData.qyy_desc2
                );
                
                // 使用Object.assign创建新的对象，避免直接修改原对象类型
                return Object.assign({}, dayunData, {
                    jiaoyunDateDesc,
                    jiaoyunDetailDesc
                });
            }
            
            return dayunData;
        } catch (error) {
            console.error('计算大运流年失败:', error);
            // 返回默认值
            return {
                startAge: 0,
                currentDayun: {
                    age: 0,
                    startYear: year,
                    gan: '',
                    zhi: '',
                    gz: ''
                },
                liunian: year,
                allDayun: []
            };
        }
    }
}
// 数据服务 - 处理数据持久化和地理位置查找
// 从BaziView.ts中提取的数据保存和地理位置功能
import { App, Notice, TFile } from 'obsidian';
import { Paipan } from '../Paipan';
import { CurrentBaziData } from '../models/types';
import { 
    findLocationData, 
    findLocationInGroups
} from '../utils/locationUtils';
import type ZipingPlugin from '../main'; // 添加插件类型

export interface CaseData {
    title: string;
    data: CurrentBaziData;
    timestamp: number;
}

export class DataService {
    private app: App;
    private paipan: Paipan;
    private plugin: any; // 引用主插件实例，用于访问保存方法

    constructor(app: App, paipan: Paipan, plugin: any) {
        this.app = app;
        this.paipan = paipan;
        this.plugin = plugin;
    }

    // 保存案例
    async saveCase(currentData: CurrentBaziData | null, defaultTitle: string = '八字案例'): Promise<void> {
        if (!currentData) {
            new Notice('没有要保存的数据');
            return;
        }

        const title = currentData.name && currentData.name !== defaultTitle ? currentData.name : defaultTitle;
        await this.plugin.saveBaziToFile(title, currentData);
    }

    // 根据区县名称查找完整的地理信息数据
    findLocationData(districtName: string, cityName: string, provinceName: string): { longitude: number, latitude: number } | null {
        return findLocationData(districtName, cityName, provinceName);
    }

    // 在三级联动数据中查找地理位置信息
    findLocationInGroups(districtName: string, cityName: string, provinceName: string): { longitude: number; latitude: number; } | null {
        return findLocationInGroups(districtName, cityName, provinceName);
    }

    // 加载案例数据
    async loadCase(file: TFile): Promise<CaseData | null> {
        try {
            const fileContent = await this.app.vault.read(file);
            const data = JSON.parse(fileContent);
            return {
                title: data.title || '未命名案例',
                data: data.data,
                timestamp: data.timestamp || Date.now()
            };
        } catch (error) {
            console.error('加载案例失败:', error);
            new Notice(`加载案例失败: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    // 获取所有保存的案例
    async getAllCases(): Promise<CaseData[]> {
        const cases: CaseData[] = [];
        const files = this.app.vault.getFiles();
        
        // 查找所有八字案例文件（基于文件名或内容格式）
        const caseFiles = files.filter(file => 
            file.path.includes('八字案例') || 
            file.path.includes('bazi-case') ||
            file.extension === 'json'
        );

        for (const file of caseFiles) {
            try {
                const caseData = await this.loadCase(file);
                if (caseData) {
                    cases.push(caseData);
                }
            } catch (error) {
                console.warn(`加载案例文件失败 ${file.path}:`, error);
            }
        }

        // 按时间戳排序（最新的在前）
        return cases.sort((a, b) => b.timestamp - a.timestamp);
    }

    // 删除案例
    async deleteCase(file: TFile): Promise<boolean> {
        try {
            await this.app.vault.delete(file);
            new Notice('案例已删除');
            return true;
        } catch (error) {
            console.error('删除案例失败:', error);
            new Notice(`删除案例失败: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    // 导出案例数据为JSON
    exportCaseData(caseData: CaseData): string {
        return JSON.stringify(caseData, null, 2);
    }

    // 导入案例数据
    importCaseData(jsonData: string): CaseData | null {
        try {
            const data = JSON.parse(jsonData);
            return {
                title: data.title || '导入的案例',
                data: data.data,
                timestamp: data.timestamp || Date.now()
            };
        } catch (error) {
            console.error('导入案例数据失败:', error);
            new Notice(`导入案例数据失败: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
}
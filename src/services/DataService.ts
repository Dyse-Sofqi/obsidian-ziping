/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// 数据服务 - 处理数据持久化和地理位置查找
// 从BaziView.ts中提取的数据保存和地理位置功能
import { App, Notice, TFile } from 'obsidian';
import { Paipan } from '../Paipan';
import { CurrentBaziData } from '../models/types';
import { 
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
    async saveCase(currentData: CurrentBaziData | null, defaultTitle: string = '未命名'): Promise<void> {
        if (!currentData) {
            new Notice('没有要保存的数据');
            return;
        }
        const title = currentData.name && currentData.name !== defaultTitle ? currentData.name : defaultTitle;
        await this.plugin.saveBaziToFile(title, currentData);
    }

    // 在三级联动数据中查找地理位置信息
    findLocationInGroups(districtName: string, cityName: string, provinceName: string): { longitude: number; latitude: number; } | null {
        return findLocationInGroups(districtName, cityName, provinceName);
    }
}
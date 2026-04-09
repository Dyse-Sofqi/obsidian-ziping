// 简化版BaziView - 使用重构后的模块
// 这是重构后的主视图类，只负责视图生命周期管理和组件组装
import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { domToBlob } from 'modern-screenshot';
import { Paipan } from '../Paipan';
import { BaziService } from '../services/BaziService';
import { IdentificationService } from '../services/IdentificationService';
import { DataService } from '../services/DataService';
import { TimeSettingModal } from './TimeSettingModal';
import { BaziTable } from './components/BaziTable';
import { DayunDisplay } from './components/DayunDisplay';
import { ResultDisplay } from './components/ResultDisplay';
import { CurrentBaziData } from '../models/types';
import ZipingPlugin from '../main';

export const PAIPAN_VIEW_TYPE = "paipan-view";

export class BaziView extends ItemView {
    plugin: ZipingPlugin;
    paipan: Paipan;
    currentData: CurrentBaziData | null = null;
    private resultContainer: HTMLDivElement | null = null; // 用于截图的结果容器

    // 服务实例
    private baziService: BaziService;
    private identificationService: IdentificationService;
    private dataService: DataService;

    // UI组件实例
    private baziTable: BaziTable;
    private dayunDisplay: DayunDisplay;
    private resultDisplay: ResultDisplay;

    constructor(leaf: WorkspaceLeaf, plugin: ZipingPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.paipan = new Paipan(false);
        this.paipan.J = 0;
        this.paipan.W = 0;
        
        // 初始化服务
        this.baziService = new BaziService(this.paipan);
        this.identificationService = new IdentificationService(
            this.app, this.paipan, this.baziService
        );
        this.dataService = new DataService(this.app, this.paipan, this.plugin);
        
        // 初始化UI组件
        this.baziTable = new BaziTable(this.paipan);
        this.dayunDisplay = new DayunDisplay(this.paipan);
        this.resultDisplay = new ResultDisplay(this.paipan);
    }

    getViewType(): string {
        return PAIPAN_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "子平排盘";
    }

    getIcon(): string {
        return "calendar";
    }

    async onOpen(): Promise<void> {
        this.renderContent();
        
        // 设置识别服务回调
        this.identificationService.setCallback((code, name) => {
            this.loadPaiPanFromCode(code, name);
        });
        
        // 设置时间调整和时柱显示回调
        this.resultDisplay.setCallbacks(
            (hourDelta: number) => {
                this.adjustHour(hourDelta);
            },
            (showHourPillar: boolean) => {
                if (this.currentData) {
                    this.currentData.showHourPillar = showHourPillar;
                    this.refreshDisplay();
                }
            }
        );
        
        // 设置大运显示回调
        this.dayunDisplay.setCallbacks(
            (index: number) => {
                this.selectDayun(index);
            },
            (dayunIndex: number, liunianIndex: number) => {
                this.selectLiunian(dayunIndex, liunianIndex);
            },
            () => {
                this.selectXiaoyun();
            }
        );
    }

    onClose(): Promise<void> {
        // 清理资源
        return Promise.resolve();
    }

    // 渲染主内容
    renderContent(): void {
        const container = this.containerEl.children[1] as HTMLDivElement;
        container.empty();
        container.addClass('bazi-view-container');
        
        // 创建主内容区域
        const mainContent = container.createEl('div');
        mainContent.addClass('bazi-main-content');
        
        // 创建操作按钮区域
        const buttonContainer = mainContent.createEl('div');
        buttonContainer.addClass('bazi-button-container');
        
        // 添加操作按钮
        const timeButton = buttonContainer.createEl('button', {
            text: '时间设置'
        });
        timeButton.addEventListener('click', () => {
            this.showTimeSettingModal();
        });
        
        const identifyButton = buttonContainer.createEl('button', {
            text: '识别排盘'
        });
        identifyButton.addEventListener('click', () => {
            void this.identificationService.identifyPaiPanCodes();
        });
        
        const saveButton = buttonContainer.createEl('button', {
            text: '保存案例'
        });
        saveButton.addEventListener('click', () => {
            void this.saveCurrentCase();
        });
        
        // 添加"回到现在"按钮
        const currentTimeButton = buttonContainer.createEl('button', {
            text: '回到现在'
        });
        currentTimeButton.addEventListener('click', () => {
            this.loadCurrentTime();
        });
        
        // 添加"复制截图"按钮
        const copyScreenshotButton = buttonContainer.createEl('button', {
            text: '复制截图',
            cls: 'copy-screenshot-btn'
        });
        copyScreenshotButton.addEventListener('click', () => {
            void this.copyScreenshot();
        });
        
        // 创建结果显示区域
        this.resultContainer = mainContent.createEl('div');
        this.resultContainer.addClass('bazi-result-container');
        this.resultContainer.id = 'bazi-result';
        
        // 初始加载当前时间的数据
        this.loadCurrentTime();
    }
    
    // 加载当前时间的数据
    loadCurrentTime(): void {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const second = now.getSeconds();
        
        // 回到现在时，重置为默认性别（男性）和默认设置
        const gender = 0; // 默认男性
        const name = this.currentData?.name ?? '';
        // 回到现在时，重置校时状态为未勾选
        const timeCorrectionEnabled = false;
        const tag = this.currentData?.tag ?? '';
        
        void this.updateBaziDisplay(year, month, day, hour, minute, second, gender, name, timeCorrectionEnabled, tag);
    }
    
    // 更新八字显示
    async updateBaziDisplay(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number = 0,
        second: number = 0,
        gender: number = 0,
        name: string = '',
        timeCorrectionEnabled: boolean = false,
        tag: string = '',
        preserveSelection: boolean = false
    ): Promise<void> {
        const container = this.containerEl.children[1] as HTMLDivElement;
        if (!container) return;
        
        // 清空容器
        const resultContainer = container.querySelector('.bazi-result-container');
        if (resultContainer) {
            resultContainer.empty();
        }
        
        // 获取八字数据，传递现有的地理位置信息
        const baziData = await this.baziService.calculateBazi(
            year, month, day, hour, minute, second,
            gender, name, timeCorrectionEnabled, tag,
            this.currentData  // 传递现有的地理位置信息
        );
        
        if (!baziData) {
            new Notice('计算八字失败');
            return;
        }
        
        // 如果保留选中状态，则使用当前的选中索引
        if (preserveSelection && this.currentData) {
            baziData.selectedDayunIndex = this.currentData.selectedDayunIndex;
            baziData.selectedLiunianIndex = this.currentData.selectedLiunianIndex;
            baziData.showHourPillar = this.currentData.showHourPillar;
        }
        
        // 更新当前数据
        this.currentData = baziData;
        
        // 显示结果
        if (resultContainer) {
            // 显示时间信息、八字表格、大运信息
            this.resultDisplay.displayResults(resultContainer, baziData);
            this.baziTable.createBaziTable(resultContainer, baziData);
            this.dayunDisplay.displayDayunInfo(resultContainer, baziData);
        }
    }
    
    // 显示时间设置模态框
    showTimeSettingModal(): void {
        const modal = new TimeSettingModal(this.app, this);
        modal.open();
    }
    
    // 调整小时
    adjustHour(hourDelta: number): void {
        if (!this.currentData) return;
        
        let newHour = this.currentData.hour + hourDelta;
        if (newHour < 0) {
            newHour = 23;
        } else if (newHour > 23) {
            newHour = 0;
        }
        
        this.currentData.hour = newHour;
        void this.updateBaziDisplay(
            this.currentData.year,
            this.currentData.month,
            this.currentData.day,
            newHour,
            this.currentData.minute,
            this.currentData.second
        );
    }
    
    // 加载排盘码
    loadPaiPanFromCode(code: string, name: string): void {
        const parsed = this.identificationService.parsePaiPanCode(code);
        if (parsed.isValid) {
            void this.updateBaziDisplay(
                parsed.year,
                parsed.month,
                parsed.day,
                parsed.hour,
                parsed.minute,
                0, // second
                parsed.gender, // gender
                name // name
            );
            new Notice(`已加载排盘码: ${name}`);
        } else {
            new Notice('无效的排盘码格式');
        }
    }
    
    // 保存当前案例
    async saveCurrentCase(): Promise<void> {
        await this.dataService.saveCase(this.currentData);
    }
    
    // 选择大运
    selectDayun(index: number): void {
        if (!this.currentData) return;
        this.currentData.selectedDayunIndex = index;
        // 重置流年选择
        this.currentData.selectedLiunianIndex = 0;
        this.refreshDisplay();
    }
    
    // 选择流年
    selectLiunian(dayunIndex: number, liunianIndex: number): void {
        if (!this.currentData) return;
        this.currentData.selectedDayunIndex = dayunIndex;
        this.currentData.selectedLiunianIndex = liunianIndex;
        this.refreshDisplay();
    }
    
    // 选择小运
    selectXiaoyun(): void {
        if (!this.currentData) return;
        this.currentData.selectedDayunIndex = -1;
        // 重置流年选择
        this.currentData.selectedLiunianIndex = 0;
        this.refreshDisplay();
    }
    
    // 刷新显示
    refreshDisplay(): void {
        if (!this.currentData) return;
        void this.updateBaziDisplay(
            this.currentData.year,
            this.currentData.month,
            this.currentData.day,
            this.currentData.hour,
            this.currentData.minute,
            this.currentData.second,
            this.currentData.gender,
            this.currentData.name || '',
            this.currentData.timeCorrectionEnabled || false,
            this.currentData.tag || '',
            true // preserveSelection
        );
    }
    
    // 适配器方法，用于TimeSettingModal的回调
    async calculateAndDisplay(
        year: number,
        month: number, 
        day: number,
        hour: number,
        minute: number,
        second: number,
        gender: number,
        name: string,
        timeCorrectionEnabled: boolean,
        tag: string
    ): Promise<void> {
        // 创建新的数据对象，传递现有的地理位置信息
        const baziData = await this.baziService.calculateBazi(
            year, month, day, hour, minute, second,
            gender, name, timeCorrectionEnabled, tag,
            this.currentData  // 传递现有的地理位置信息
        );
        
        if (baziData) {
            baziData.name = name;
            baziData.gender = gender;
            baziData.timeCorrectionEnabled = timeCorrectionEnabled;
            baziData.tag = tag;
            this.currentData = baziData;
            
            await this.updateBaziDisplay(
                year, month, day, hour, minute, second,
                gender, name, timeCorrectionEnabled, tag
            );
        }
    }
    
    // 复制截图到剪贴板
    async copyScreenshot(): Promise<void> {
        try {
            if (!this.resultContainer) {
                new Notice('没有结果显示，无法截图');
                return;
            }
            
            // 等待字体加载完成
            await document.fonts.ready;
            
            // 获取背景色：优先从 CSS 变量获取，若为空则从 body 获取计算后的背景色
            let bgColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--background-secondary')
                .trim();
            
            // 如果 CSS 变量为空，尝试从 body 获取背景色
            if (!bgColor) {
                bgColor = getComputedStyle(document.body).backgroundColor;
            }
            
            // 如果仍然为空，使用默认浅灰色
            if (!bgColor) {
                bgColor = '#f5f5f5';
            }
            
            const blob = await domToBlob(this.resultContainer, {
                scale: window.devicePixelRatio * 2 || 2,
                backgroundColor: bgColor,
                quality: 1,
            });
            
            if (blob) {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                new Notice('截图已复制到剪贴板');
            }
        } catch (error) {
            let errorMessage = '未知错误';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                errorMessage = JSON.stringify(error);
            }
            new Notice('截图失败: ' + errorMessage);
        }
    }
}

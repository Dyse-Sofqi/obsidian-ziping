// 排盘码识别服务
// 从BaziView.ts中提取的排盘码识别功能
import { App, Notice, Modal } from 'obsidian';
import { Paipan } from '../Paipan';
import { BaziService } from './BaziService';

export interface PaiPanCodeResult {
    code: string;
    name: string;
}

// 选择排盘模态框
class PaiPanSelectionModal extends Modal {
    private results: Map<string, string>;
    private onSelected: (code: string, name: string) => void;

    constructor(app: App, results: Map<string, string>, onSelected: (code: string, name: string) => void) {
        super(app);
        this.results = results;
        this.onSelected = onSelected;
    }

    onOpen() {
        const { contentEl } = this;
        this.titleEl.setText('选择排盘');

        contentEl.createEl('p', { text: '请选择要加载的排盘:' });

        const selectEl = contentEl.createEl('select', { cls: 'pai-pan-select' });

        // 添加一个默认选项
        const defaultOption = selectEl.createEl('option');
        defaultOption.value = '';
        defaultOption.text = '请选择...';
        defaultOption.disabled = true;
        defaultOption.selected = true;

        // 添加每个排盘选项
        this.results.forEach((name, code) => {
            const option = selectEl.createEl('option');
            option.value = code;
            option.text = `${code}，${name}`;
        });

        // 添加确认按钮
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        const confirmBtn = buttonContainer.createEl('button', { text: '加载' });
        const cancelBtn = buttonContainer.createEl('button', { text: '取消' });

        confirmBtn.addEventListener('click', () => {
            const selectedCode = selectEl.value;
            if (!selectedCode) {
                new Notice('请选择一个排盘');
                return;
            }

            const name = this.results.get(selectedCode) || '未命名';
            this.onSelected(selectedCode, name);
            this.close();
        });

        cancelBtn.addEventListener('click', () => {
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class IdentificationService {
    private app: App;
    private paipan: Paipan;
    private baziService: BaziService;
    private onCodeIdentified?: (code: string, name: string) => void;

    constructor(app: App, paipan: Paipan, baziService: BaziService) {
        this.app = app;
        this.paipan = paipan;
        this.baziService = baziService;
    }

    // 设置回调函数
    setCallback(onCodeIdentified?: (code: string, name: string) => void) {
        this.onCodeIdentified = onCodeIdentified;
    }

    // 识别排盘码
    async identifyPaiPanCodes(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('请先打开一个笔记文档');
            return;
        }

        // 获取选中文本或整个文档
        let searchText = '';
        let hasSelection = false;

        try {
            const activeView = this.app.workspace.activeEditor;
            if (activeView && activeView.editor) {
                const selection = activeView.editor.getSelection();
                if (selection.trim()) {
                    searchText = selection;
                    hasSelection = true;
                    new Notice('已从选中文本中识别排盘码');
                }
            }
        } catch (error) {
            console.warn('获取选中文本失败:', error);
        }

        if (!hasSelection) {
            try {
                searchText = await this.app.vault.read(activeFile);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                new Notice('读取文档失败: ' + errorMessage);
                return;
            }
        }

        // 识别排盘码
        const results = this.extractPaiPanCodes(searchText, hasSelection);

        if (results.size === 0) {
            new Notice('没有找到符合格式的排盘码');
            return;
        }

        // 如果只有一条记录，直接自动加载
        if (results.size === 1) {
            const firstCode = Array.from(results.keys())[0];
            if (!firstCode) return;
            const name = results.get(firstCode) || '未命名';
            if (this.onCodeIdentified) {
                this.onCodeIdentified(firstCode, name);
            }
            return;
        }

        // 多条记录显示选择模态框
        if (this.onCodeIdentified) {
            const modal = new PaiPanSelectionModal(
                this.app, 
                results, 
                (code, name) => {
                    this.onCodeIdentified!(code, name);
                }
            );
            modal.open();
        } else {
            new Notice(`找到 ${results.size} 个排盘码，请设置回调函数`);
        }
    }

    // 从文本中提取排盘码
    private extractPaiPanCodes(searchText: string, hasSelection: boolean): Map<string, string> {
        const globalCodeOnlyRegex = /(\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}-[XY])/g;
        const globalCodeWithNameRegex = /(\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}-[XY])，([\u4e00-\u9fa5a-zA-Z0-9_-]+)/g;

        const results = new Map<string, string>();

        if (hasSelection) {
            // 匹配排盘码+姓名的格式
            const nameMatches = searchText.matchAll(globalCodeWithNameRegex);
            for (const match of nameMatches) {
                const code = match[1];
                const name = match[2];
                if (code && name) {
                    this.updateResults(results, code, name);
                }
            }

            // 匹配纯排盘码格式
            const codeMatches = searchText.matchAll(globalCodeOnlyRegex);
            for (const match of codeMatches) {
                const code = match[1];
                if (code) {
                    if (!results.has(code)) {
                        results.set(code, '未命名');
                    } else {
                        const existingName = results.get(code);
                        if (!existingName || existingName === '未命名') {
                            results.set(code, '未命名');
                        }
                    }
                }
            }
        } else {
            // 使用四级标题识别方法
            const headingRegex = /^(####\s+.+)$/gm;
            const headings = searchText.match(headingRegex) || [];

            for (let heading of headings) {
                const headingText = heading.replace(/^####\s+/, '').trim();
                const codeWithNameRegex = /(\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}-[XY])，([\u4e00-\u9fa5a-zA-Z0-9_-]+)/;
                let match = headingText.match(codeWithNameRegex);
                if (match) {
                    const code = match[1];
                    const name = match[2];
                    if (code && name) {
                        this.updateResults(results, code, name);
                    }
                    continue;
                }

                const codeOnlyRegex = /(\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}-[XY])/;
                match = headingText.match(codeOnlyRegex);
                if (match) {
                    const code = match[1];
                    if (code) {
                        if (!results.has(code)) {
                            results.set(code, '未命名');
                        } else {
                            const existingName = results.get(code);
                            if (!existingName || existingName === '未命名') {
                                results.set(code, '未命名');
                            }
                        }
                    }
                }
            }
        }

        return results;
    }

    // 更新结果集合
    private updateResults(results: Map<string, string>, code: string, name: string): void {
        if (results.has(code)) {
            const existingName = results.get(code);
            if (name && name.trim() && name !== '未命名' && (!existingName || existingName === '未命名')) {
                results.set(code, name);
            } else if (name && name.trim() && name !== '未命名' && existingName && existingName !== '未命名') {
                results.set(code, name);
            }
        } else {
            results.set(code, name);
        }
    }

    // 解析排盘码
    parsePaiPanCode(code: string): { 
        year: number; 
        month: number; 
        day: number; 
        hour: number; 
        minute: number; 
        gender: number;
        isValid: boolean;
    } {
        // 解析排盘码格式：YYYY.MM.DD-HH.MM-G
        const match = code.match(/^(\d{4})\.(\d{2})\.(\d{2})-(\d{2})\.(\d{2})-([XY])$/);
        if (!match || !match[1] || !match[2] || !match[3] || !match[4] || !match[5] || !match[6]) {
            return {
                year: 0,
                month: 0,
                day: 0,
                hour: 0,
                minute: 0,
                gender: 0,
                isValid: false
            };
        }

        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        const hour = parseInt(match[4]);
        const minute = parseInt(match[5]);
        const genderCode = match[6];
        const gender = genderCode === 'Y' ? 0 : 1;

        return {
            year,
            month,
            day,
            hour,
            minute,
            gender,
            isValid: true
        };
    }

    // 生成排盘码
    generatePaiPanCode(
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        gender: number
    ): string {
        const genderCode = gender === 0 ? 'Y' : 'X';
        return `${String(year)}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}-${String(hour).padStart(2, '0')}.${String(minute).padStart(2, '0')}-${genderCode}`;
    }

    // 验证排盘码格式
    isValidPaiPanCode(code: string): boolean {
        const result = this.parsePaiPanCode(code);
        return result.isValid;
    }
}
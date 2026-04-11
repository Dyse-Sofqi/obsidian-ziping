// 流月显示组件
import { CurrentBaziData, LiuyueItem } from '../../models/types';

export class LiuyueDisplay {
    private onLiuyueSelect?: (index: number) => void;

    // 设置回调函数
    setCallbacks(onLiuyueSelect?: (index: number) => void) {
        this.onLiuyueSelect = onLiuyueSelect;
    }

    // 从完整十神名称获取简写
    private getShiShenShortFromFull(shiShenFull: string): string {
        const shiShenMap: Record<string, string> = {
            '比肩': '比', '劫财': '劫', '食神': '食', '伤官': '伤',
            '偏财': '才', '正财': '财', '七杀': '杀', '偏官': '杀', '正官': '官',
            '偏印': '枭', '正印': '印'
        };

        return shiShenMap[shiShenFull] || '';
    }

    // 显示流月信息
    displayLiuyueInfo(container: Element, data: CurrentBaziData) {
        const { liuyue, selectedLiuyueIndex } = data;
        
        if (!liuyue || liuyue.length === 0) {
            const emptyMsg = container.createEl('div');
            emptyMsg.textContent = '暂无流月数据';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = '#666';
            return;
        }

        // 添加流月按钮容器
        const liuyueContainer = container.createEl('div');
        liuyueContainer.addClass('liuyue-list');

        // 创建流月按钮列表
        liuyue.forEach((item: LiuyueItem, index: number) => {
            const liuyueBtn = liuyueContainer.createEl('button');
            liuyueBtn.addClass('liuyue-btn');
            
            // 设置选中状态
            if (index === (selectedLiuyueIndex || 0)) {
                liuyueBtn.classList.add('is-selected');
            }

            // 第一行：流月名称
            const nameLine = liuyueBtn.createEl('div');
            nameLine.textContent = item.name;
            nameLine.addClass('liuyue-name');

            // 第二行：日期
            const dateLine = liuyueBtn.createEl('div');
            dateLine.textContent = item.date;
            dateLine.addClass('liuyue-date');

            // 第三行：天干 + 十神简写（添加五行颜色类）
            const gan = item.gan || item.gz.charAt(0);
            const ganWuXing = this.getGanWuXing(gan); // 获取天干的五行属性
            const ganShiShen = item.ganShishen || item.shishen || ''; // 优先使用ganShishen，保持兼容性，设置默认值为空字符串
            const ganShiShenShort = this.getShiShenShortFromFull(ganShiShen);
            const ganLine = liuyueBtn.createEl('div');
            const ganSpan = ganLine.createEl('span');
            ganSpan.textContent = gan;
            ganSpan.addClass('c-' + ganWuXing); // 添加五行颜色类
            const ganShiShenSpan = ganLine.createEl('span');
            ganShiShenSpan.textContent = ganShiShenShort;
            ganLine.addClass('liuyue-gan');

            // 第四行：地支 + 十神简写（添加五行颜色类）
            const zhi = item.zhi || (item.gz.charAt(1) || '');
            const zhiWuXing = this.getZhiWuXing(zhi); // 获取地支的五行属性
            const zhiShiShen = item.zhiShishen || ''; // 使用zhiShishen属性
            const zhiShiShenShort = this.getShiShenShortFromFull(zhiShiShen);
            const zhiLine = liuyueBtn.createEl('div');
            const zhiSpan = zhiLine.createEl('span');
            zhiSpan.textContent = zhi;
            zhiSpan.addClass('c-' + zhiWuXing); // 添加五行颜色类
            const zhiShiShenSpan = zhiLine.createEl('span');
            zhiShiShenSpan.textContent = zhiShiShenShort;
            zhiLine.addClass('liuyue-zhi');

            // 添加点击事件
            liuyueBtn.addEventListener('click', () => {
                if (this.onLiuyueSelect) {
                    this.onLiuyueSelect(index);
                }
            });
        });
    }

    // 获取天干的五行属性
    private getGanWuXing(gan: string): string {
        const ganWuXingMap: Record<string, string> = {
            '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', 
            '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
        };
        return ganWuXingMap[gan] || '土';
    }

    // 获取地支的五行属性
    private getZhiWuXing(zhi: string): string {
        const zhiWuXingMap: Record<string, string> = {
            '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
            '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
        };
        return zhiWuXingMap[zhi] || '土';
    }
}
import { StyleModule } from 'style-mod';

// 预定义样式类名和对应的 CSS 规则
export const styleModule = new StyleModule({
    // 基础的 Flex 容器，启用 flex 布局
    '.ziping-flex': { display: 'flex' },
    '.ziping-flex-column': { flexDirection: 'column' },
    '.ziping-flex-end': { display: 'flex', justifyContent: 'flex-end' },
    '.ziping-flex-align-center': {
        display: 'flex',
        alignItems: 'center'
    },
    '.ziping-flex-gap-0-mb-6-0-6-0': {
        display: 'flex',
        gap: '0px',
        margin: '6px 0px 6px 0px',
        alignItems: 'center'
    },
    '.ziping-flex-gap-0-justify-end': {
        display: 'flex',
        gap: '0px',
        alignItems: 'center',
        justifyContent: 'flex-end'
    },

    // 常见间距
    '.ziping-gap-0': { gap: '0px' },
    '.ziping-gap-10': { gap: '10px' },
    '.ziping-margin-0': { margin: '0px' },
    '.ziping-padding-0': { padding: '0px' },
    '.ziping-width-100': { width: '100%' },

    // 边框
    // 无边框样式
    '.ziping-border-none': { border: 'none' },
    // 移除边框阴影
    '.ziping-boxShadow-none': { boxShadow: 'none' },
    // 直角边框、5px的圆角效果
    '.ziping-border-radius-0': { borderRadius: '0px' },
    '.ziping-border-radius-5': { borderRadius: '5px' },
    '.ziping-border-left': { borderLeft: '1px solid #ccc' },
    // 最大高度限制
    '.ziping-max-height-300': { maxHeight: '300px' },
    // 垂直方向溢出，自动滚动
    '.ziping-overflow-y-auto': { overflowY: 'auto' },

    // 其他常见样式
    '.ziping-font-bold': { fontWeight: 'bold' },
    '.ziping-font-weight-600': { fontWeight: '600' },

    // 表格样式
    '.ziping-table-style': {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '5px'
    },
    '.ziping-table-header': {
        border: '1px solid #ccc',
        padding: '6px 8px',
        backgroundColor: '#f5f5f5'
    },
    '.ziping-table-cell': {
        border: '1px solid #ccc',
        padding: '6px 8px',
        textAlign: 'center'
    },
    '.ziping-table-cell-bold': {
        padding: '6px 8px',
        fontWeight: 'bold',
        textAlign: 'center'
    },

    // 按钮样式
    '.ziping-button-active': {
        backgroundColor: 'var(--background-secondary)',
        color: 'var(--interactive-accent)'
    },
    '.ziping-button-inactive': {
        backgroundColor: '#f1f1f1',
        color: 'black'
    },

    // 列表样式
    '.ziping-list-style-none': {
        listStyleType: 'none',
        padding: '0'
    },
    '.ziping-list-item-padding': {
        padding: '8px 0',
    },

    // 其他特定样式
    '.ziping-margin-top-20': { marginTop: '20px' },
    '.ziping-margin-bottom-10': { marginBottom: '10px' },

    // 边框和边距组合
    '.ziping-border-1-ccc': {
        border: '1px solid #ccc'
    },

    '.ziping-transition-bg': {
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    '.ziping-outline-1-ccc': {
        outline: '1px solid #ccc'
    },

    '.ziping-background-f5f5f5': {
        backgroundColor: '#f5f5f5'
    },

    //折叠
    '.ziping-flex-wrap': {
        flexWrap: 'wrap'
    },
    '.ziping-flex-nowrap': {
        flexWrap: 'nowrap'
    }
});

// 初始化函数，在插件启动时挂载样式模块
export function initializeStyleUtils(): void {
    StyleModule.mount(document, styleModule);
}

// 样式应用辅助函数（如果需要的话）
export function applyStyles(element: HTMLElement, styleClassNames: string[]): void {
    styleClassNames.forEach(className => {
        if (className.startsWith('ziping-')) {
            element.addClass(className);
        }
    });
}

// 移除样式辅助函数
export function removeStyles(element: HTMLElement, styleClassNames: string[]): void {
    styleClassNames.forEach(className => {
        element.removeClass(className);
    });
}
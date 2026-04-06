import { StyleModule } from 'style-mod';

// 预定义样式类名和对应的 CSS 规则
export const styleModule = new StyleModule({
    // Flex 布局样式
    '.ziping-flex': {
        display: 'flex'
    },
    '.ziping-flex-column': {
        display: 'flex',
        flexDirection: 'column'
    },
    '.ziping-flex-row': {
        display: 'flex',
        flexDirection: 'row'
    },
    '.ziping-flex-center': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    '.ziping-flex-between': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    '.ziping-flex-end': {
        display: 'flex',
        justifyContent: 'flex-end'
    },
    '.ziping-flex-align-center': {
        display: 'flex',
        alignItems: 'center'
    },
    
    // 常见间距
    '.ziping-gap-0': { gap: '0px' },
    '.ziping-gap-3': { gap: '3px' },
    '.ziping-gap-6': { gap: '6px' },
    '.ziping-gap-8': { gap: '8px' },
    '.ziping-gap-10': { gap: '10px' },
    
    // 边距
    '.ziping-margin-0': { margin: '0px' },
    '.ziping-margin-3': { margin: '3px' },
    '.ziping-margin-6': { margin: '6px' },
    '.ziping-margin-top-0': { marginTop: '0px' },
    '.ziping-margin-top-3': { marginTop: '3px' },
    '.ziping-margin-top-5': { marginTop: '5px' },
    '.ziping-margin-bottom-3': { marginBottom: '3px' },
    '.ziping-margin-bottom-0': { marginBottom: '0px' },
    '.ziping-margin-6-0-3-0': { margin: '6px 0px 3px 0px' },
    
    // 内边距
    '.ziping-padding-0': { padding: '0px' },
    '.ziping-padding-3': { padding: '3px' },
    '.ziping-padding-6': { padding: '6px' },
    
    // 宽高
    '.ziping-width-100': { width: '100%' },
    '.ziping-width-50': { width: '50%' },
    '.ziping-height-100': { height: '100%' },
    '.ziping-min-width-100': { minWidth: '100px' },
    
    // 文字对齐
    '.ziping-text-center': { textAlign: 'center' },
    '.ziping-text-left': { textAlign: 'left' },
    '.ziping-text-right': { textAlign: 'right' },
    
    // 边框
    '.ziping-border-bottom': { borderBottom: '1px solid var(--background-modifier-border)' },
    '.ziping-border-none': { border: 'none' },
    '.ziping-border-radius-5': { borderRadius: '5px' },
    '.ziping-max-height-300': { maxHeight: '300px' },
    '.ziping-overflow-y-auto': { overflowY: 'auto' },
    
    // 可见性
    '.ziping-display-none': { display: 'none' },
    '.ziping-display-block': { display: 'block' },
    '.ziping-display-inline': { display: 'inline' },
    '.ziping-hidden': { visibility: 'hidden' },
    
    // 其他常见样式
    '.ziping-cursor-pointer': { cursor: 'pointer' },
    '.ziping-font-small': { fontSize: 'smaller' },
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
    
    // select 控件样式
    '.ziping-select-style': {
        padding: '5px',
        border: '1px solid #ccc',
        borderRadius: '0'
    },
    '.ziping-select-no-right-border': {
        borderRight: 'none'
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
        borderBottom: '1px solid #eee'
    },
    
    // 其他特定样式
    '.ziping-margin-left-5': { marginLeft: '5px' },
    '.ziping-margin-top-20': { marginTop: '20px' },
    '.ziping-margin-bottom-10': { marginBottom: '10px' },
    
    // 特定布局组合样式
    '.ziping-flex-gap-10-mb-10': {
        display: 'flex',
        gap: '10px',
        marginBottom: '10px'
    },
    
    // 边框和边距组合
    '.ziping-border-1-ddd': {
        border: '1px solid #ddd'
    },
    '.ziping-transition-bg': {
        cursor: 'pointer',
        transition: 'background-color 0.2s'
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
            element.classList.add(className);
        }
    });
}

// 移除样式辅助函数
export function removeStyles(element: HTMLElement, styleClassNames: string[]): void {
    styleClassNames.forEach(className => {
        element.classList.remove(className);
    });
}
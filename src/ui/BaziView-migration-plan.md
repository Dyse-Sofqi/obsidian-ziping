# BaziView 功能迁移计划

## 当前状态分析

### 旧BaziView (src/BaziView.ts) - 2235行
**核心功能：**
1. 完整的八字表格显示（createBaziTable方法）
2. 大运流年交互选择（selectDayun, selectLiunian, selectXiaoyun）
3. 截图复制到剪贴板功能（使用modern-screenshot）
4. 排盘码识别和加载（identifyPaiPanCodes, loadPaiPanFromCode）
5. 案例保存（saveCase）
6. 时间调整按钮（时↑/时↓）
7. 显示功能：公历/农历/干支历显示、节气信息、真太阳时
8. 时间设置模态框（类内定义，现已提取到TimeSettingModal.ts）

### 新BaziView (src/ui/BaziView.ts) - 154行
**当前功能：**
1. 基本视图生命周期（onOpen, onClose）
2. 计算并显示八字（使用BaziService）
3. 简单按钮：设置时间、保存
4. 通过BaziService渲染基础内容

### 已独立组件
1. TimeSettingModal.ts - 时间设置模态框（1073行）
2. BaziService.ts - 八字计算服务（210行）
3. models/types.ts - 类型定义（94行）

## 迁移任务清单

### 第一阶段：复制核心显示功能
1. [ ] 将`createResultArea`方法从旧BaziView迁移到新BaziView
2. [ ] 将`displayResults`方法迁移到新BaziView
3. [ ] 将`createBaziTable`方法迁移到新BaziView
4. [ ] 将大运流年交互方法（selectDayun, selectLiunian, selectXiaoyun）迁移

### 第二阶段：添加辅助功能
5. [ ] 添加截图复制功能（确保modern-screenshot依赖已安装）
6. [ ] 添加排盘码识别功能（identifyPaiPanCodes, loadPaiPanFromCode）
7. [ ] 添加案例保存功能（saveCase）
8. [ ] 添加时间调整按钮（时↑/时↓）

### 第三阶段：集成和优化
9. [ ] 确保与BaziService的兼容性
10. [ ] 更新renderContent方法以使用新的显示逻辑
11. [ ] 确保所有事件监听器正确绑定
12. [ ] 测试所有功能

## 技术注意事项

### 依赖项
- modern-screenshot 已在package.json中
- html2canvas-pro 已在package.json中
- 需要确保domToBlob正确导入

### 模块化设计原则
1. 保持新架构的模块化：services处理计算，views处理显示
2. 将复杂的显示逻辑保留在BaziView中
3. 确保类型定义一致（使用models/types.ts）

### 兼容性问题
1. TimeSettingModal.ts使用`this.view.calculateAndDisplay` - 需要确保新BaziView有相同的方法签名
2. BaziService的`renderBaziContent`方法可能需要调整或替换
3. 确保CSS类名一致以保持样式

## 实施步骤

### 步骤1：增强新BaziView的构造函数
- 添加必要的DOM元素引用
- 初始化截图功能所需的状态

### 步骤2：重构renderContent方法
- 使用旧BaziView的renderContent结构
- 添加所有按钮：设置时间、回到现在、保存案例、识别排盘、复制截图
- 创建结果区域容器

### 步骤3：实现calculateAndDisplay方法
- 保持与TimeSettingModal.ts的兼容性
- 调用BaziService进行计算
- 调用displayResults进行显示

### 步骤4：实现displayResults方法
- 将旧BaziView的displayResults逻辑移植过来
- 集成createBaziTable和其他显示逻辑
- 确保大运流年交互正常工作

### 步骤5：添加辅助方法
- 实现identifyPaiPanCodes和loadPaiPanFromCode
- 实现saveCase方法
- 实现截图复制功能

## 测试计划
1. 构建插件并检查TypeScript错误
2. 测试基础八字计算和显示
3. 测试时间设置模态框交互
4. 测试大运流年选择
5. 测试截图复制功能
6. 测试排盘码识别
7. 测试案例保存功能

## 预计完成时间
- 第一阶段：2小时
- 第二阶段：1.5小时
- 第三阶段：1小时
- 测试：0.5小时
- 总计：约5小时
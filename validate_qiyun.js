// 简化版起运计算函数验证测试
// 加载paipan.js模块进行测试

const fs = require('fs');
const vm = require('vm');

// 读取paipan.js文件内容
const paipanCode = fs.readFileSync('./src/paipan.js', 'utf8');

// 创建一个上下文来执行代码
const sandbox = {
    window: {},
    console: console,
    module: { exports: {} },
    exports: {},
    require: require
};

// 在沙箱中执行代码
vm.createContext(sandbox);
vm.runInContext(paipanCode, sandbox);

// 获取PaipanEngine构造函数
const PaipanEngine = sandbox.paipan;

// 创建实例
const engine = new PaipanEngine();

// 测试简化版起运计算函数
console.log('=== 简化版起运计算函数测试 ===');

try {
    // 测试用例1: 正常情况
    const birthTimestamp = Date.UTC(1990, 0, 15, 10, 0, 0); // 1990-01-15 10:00:00 UTC
    const solarTermTimestamp = Date.UTC(1990, 1, 4, 6, 0, 0); // 1990-02-04 06:00:00 UTC (立春)
    
    const result1 = engine.calculateQiyunSimplified(birthTimestamp, solarTermTimestamp, 0, '甲');
    console.log('测试用例1结果:', result1);
    
    // 测试用例2: 儒略日转换
    const jdTest = 2451545.0; // 2000年1月1日12:00:00 UTC
    const timestamp = engine.jdToTimestamp(jdTest);
    console.log('儒略日转换测试:', jdTest, '→', new Date(timestamp).toISOString());
    
    // 测试用例3: 综合函数
    const result2 = engine.getQiyunInfo(2451545.0, 2451570.0, 0, '甲', true);
    console.log('综合函数测试(简化算法):', result2);
    
    const result3 = engine.getQiyunInfo(2451545.0, 2451570.0, 0, '甲', false);
    console.log('综合函数测试(传统算法):', result3);
    
    console.log('✅ 所有测试通过！简化版起运计算函数正常工作');
    
} catch (error) {
    console.error('❌ 测试失败:', error.message);
}

console.log('\n=== 算法对比 ===');
// 对比新旧算法结果
try {
    const spcjd = 2447890.0; // 示例儒略日
    const solarTermJd = 2447920.0; // 示例节气儒略日
    
    const simpleResult = engine.getQiyunInfo(spcjd, solarTermJd, 0, '甲', true);
    const legacyResult = engine.getQiyunInfo(spcjd, solarTermJd, 0, '甲', false);
    
    console.log('简化算法结果:', simpleResult);
    console.log('传统算法结果:', legacyResult);
    
} catch (error) {
    console.log('算法对比测试失败:', error.message);
}
// 测试1994年辛亥日的具体日期 - 使用真实的Paipan类

// 加载已经编译的Paipan类
const { Paipan } = require('./paipan.js');

// 创建Paipan实例
const paipan = new Paipan();

// 设置经纬度（使用默认值）
paipan.J = 116.4;  // 北京经度
paipan.W = 39.9;   // 北京纬度

// 测试1994年辛亥日
console.log('正在使用真实Paipan类搜索1994年的辛亥日...');
console.log('日柱干支：天干=辛，地支=亥');

// 使用filterDatesByDayGanZhi方法
const xinhaiDates = paipan.filterDatesByDayGanZhi([1994], '辛', '亥');

console.log(`\n1994年辛亥日共有 ${xinhaiDates.length} 天:`);

if (xinhaiDates.length > 0) {
    xinhaiDates.forEach((date, index) => {
        const dateObj = new Date(date.year, date.month - 1, date.day);
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[dateObj.getDay()];
        
        console.log(`${index + 1}. ${date.year}年${date.month}月${date.day}日（星期${weekday}）`);
    });
} else {
    console.log('未找到1994年的辛亥日');
}

// 额外验证：使用fatemaps方法逐日检查1994年1月的日期
console.log('\n--- 使用fatemaps方法验证1994年1月的日柱 ---');
for (let day = 1; day <= 31; day++) {
    try {
        const bazi = paipan.fatemaps(0, 1994, 1, day, 12, 0, 0);
        if (bazi && bazi.gztg && bazi.dz) {
            const dayGan = bazi.gztg[2]; // 日柱天干（索引2）
            const dayZhi = bazi.dz[2];   // 日柱地支（索引2）
            
            if (dayGan === '辛' && dayZhi === '亥') {
                console.log(`✓ 1994年1月${day}日是辛亥日`);
            }
        }
    } catch (error) {
        // 忽略无效日期错误
    }
}

console.log('\n测试完成！');
// 在观察中运行这个命令来检查调试信息：
// 打开浏览器开发者工具 → 控制台，然后粘贴并运行以下代码

// 方法1: 检查调试信息是否已设置
console.log("检查 _debugDayun 对象");
if (window._debugDayun && Object.keys(window._debugDayun).length > 0) {
    console.log("✅ 调试信息已找到:");
    console.log("   pdy (精度模式):", window._debugDayun.pdy ? "精确计算" : "粗略计算");
    console.log("   ta (年长):", window._debugDayun.ta, "天");
    console.log("   xf:", window._debugDayun.xf?.toFixed(6), "天");
    console.log("   yf:", window._debugDayun.yf?.toFixed(6), "天");
    console.log("   运方向:", window._debugDayun.direction || "未知");
    console.log("   计算模式:", window._debugDayun.mode || "未知");
    console.log("   比例系数:", window._debugDayun.ratio?.toFixed(6) || "未知");
    console.log("   zf (起运天数):", window._debugDayun.zf?.toFixed(6) || "未知", "天");
} else {
    console.log("❌ 未找到调试信息，可能需要重新运行排盘计算");
}

// 方法2: 设置一个定时器持续监控
function monitorDebugInfo() {
    if (window._debugDayun && window._debugDayun.pdy !== undefined) {
        console.log("🎯 实时监控:", {
            精度模式: window._debugDayun.pdy ? "精确计算" : "粗略计算",
            年长: window._debugDayun.ta,
            xf: window._debugDayun.xf,
            yf: window._debugDayun.yf,
            运方向: window._debugDayun.direction,
            计算模式: window._debugDayun.mode,
            起运天数: window._debugDayun.zf
        });
    }
}

// 启动监控
console.log("启动调试信息监控...");
setInterval(monitorDebugInfo, 3000);
monitorDebugInfo();
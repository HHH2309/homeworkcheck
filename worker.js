/**
 * 配置区域
 */
// ⚠️ 重要：请将此日期修改为你希望开始统计的第一天 (格式 YYYY-MM-DD)
// 只有在这个日期之后的每一天，程序才会开始累积“被抽中次数”。
const START_DATE = "2026-02-11"; 

// 你的名单
const STUDENTS = [
//名单脱敏
];

// 每日抽取人数
const PICK_COUNT = 6;

/**
 * 伪随机数生成器 (线性同余发生器)
 * 保证相同的种子(seed)总是生成相同的随机序列
 */
function sfc32(a, b, c, d) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    }
}

// 通过字符串生成种子
function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 27644437;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
}

/**
 * 核心逻辑：获取某一天的中奖名单
 */
function getDailySelection(dateStr) {
    // 使用日期字符串作为随机种子，确保同一天结果永远一致
    const seed = cyrb128(dateStr);
    const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
    
    // 复制一份名单用于洗牌
    let list = [...STUDENTS];
    
    // Fisher-Yates 洗牌算法 (使用固定种子的伪随机函数)
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    
    // 返回前 N 个人
    return list.slice(0, PICK_COUNT);
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export default {
  async fetch(request, env, ctx) {
    // 强制使用北京时间 (UTC+8)
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Shanghai"}));
    const todayStr = formatDate(now);
    
    // === 统计逻辑开始 ===
    // 初始化计数器
    const historyCounts = {};
    STUDENTS.forEach(s => historyCounts[s] = 0);
    
    let loopDate = new Date(START_DATE);
    const endDate = new Date(todayStr);
    
    let todayList = [];
    
    // 这里的逻辑是：从“开始日期”一直循环到“今天”
    // 每一天都运行一遍抽签算法，从而计算出历史累计次数
    // 这样就不需要数据库来存储历史数据了
    while (loopDate <= endDate) {
        const dStr = formatDate(loopDate);
        const selected = getDailySelection(dStr);
        
        selected.forEach(name => {
            if (historyCounts[name] !== undefined) {
                historyCounts[name]++;
            }
        });
        
        // 如果循环到了今天，把名单存下来
        if (dStr === todayStr) {
            todayList = selected;
        }
        
        // 日期+1
        loopDate.setDate(loopDate.getDate() + 1);
    }
    // === 统计逻辑结束 ===

    // 将统计结果转换为数组并排序（按次数从高到低）
    const sortedStats = Object.entries(historyCounts)
        .sort((a, b) => b[1] - a[1]);

    // HTML 模板
    const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>2717每日英语作业检查</title>
        <style>
            :root { --primary: #2563eb; --bg: #f8fafc; --card: #ffffff; --text-muted: #64748b; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: var(--bg); margin: 0; padding: 20px; color: #1e293b; display: flex; flex-direction: column; min-height: 90vh; }
            .container { max-width: 800px; margin: 0 auto; width: 100%; flex: 1; }
            
            h1 { text-align: center; color: var(--primary); margin-bottom: 10px; }
            .date { text-align: center; color: var(--text-muted); margin-bottom: 30px; font-size: 0.9em; }
            
            .card { background: var(--card); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 24px; }
            .card h2 { margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 1.25rem; color: #334155; }
            
            .lucky-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; }
            .lucky-item { background: #eff6ff; color: var(--primary); padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 1.2em; border: 1px solid #bfdbfe; transition: transform 0.2s; }
            .lucky-item:hover { transform: translateY(-2px); }
            
            .stats-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .stats-table th, .stats-table td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .stats-table th { background-color: #f1f5f9; color: #475569; font-weight: 600; font-size: 0.9em; }
            .stats-table tr:hover { background-color: #f8fafc; }
            
            .badge { background: #94a3b8; color: white; padding: 4px 10px; border-radius: 999px; font-size: 0.85em; font-weight: bold; }
            .badge.high { background: #f59e0b; }
            
            /* 页脚样式 */
            .footer { 
                margin-top: 40px; 
                padding-top: 20px; 
                border-top: 1px solid #e2e8f0; 
                text-align: center; 
                font-size: 0.85rem; 
                color: var(--text-muted);
                line-height: 1.6;
            }
            .footer a { color: var(--text-muted); text-decoration: none; border-bottom: 1px dotted var(--text-muted); transition: color 0.2s; }
            .footer a:hover { color: var(--primary); border-bottom-color: var(--primary); }
            .footer-row { margin-bottom: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>2717英语作业抽查</h1>
            <div class="date">${todayStr}</div>
            
            <div class="card">
                <h2>🏆 今日中选名单</h2>
                <div class="lucky-grid">
                    ${todayList.map(name => `<div class="lucky-item">${name}</div>`).join('')}
                </div>
            </div>
            
            <div class="card">
                <h2>📊 历史统计 (自 ${START_DATE} 起)</h2>
                <div style="overflow-x: auto;">
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th style="width: 60px;">历史抽取次数排名</th>
                                <th>姓名</th>
                                <th style="width: 100px;">被抽中次数</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedStats.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${item[0]}</td>
                                    <td><span class="badge ${item[1] > 5 ? 'high' : ''}">${item[1]}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 页脚区域 -->
            <div class="footer">
                <div class="footer-row">
                    由 <a href="https://www.cloudflare.com/zh-cn/" target="_blank">Cloudflare</a> Worker 提供 Serverless 支持
                </div>
                <div class="footer-row">
                    本项目基于 MIT 协议开源 | 
                    <a href="https://github.com/HHH2309/homeworkcheck" target="_blank">公平性保障</a> | 
                    Powered By <a href="https://github.com/HHH2309" target="_blank">HHH2309</a>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    return new Response(html, {
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    });
  },
};

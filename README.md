# StockTracker - 智能股票持仓管理助手

StockTracker 是一款基于 React 和 Vite 开发的轻量级个人股票投资管理工具。它不仅能帮助你记录每一笔交易，还能通过 AI 助手提供深度的持仓分析与市场建议。

## 核心功能

- **📈 持仓汇总**：自动计算持仓成本、实时市值、浮动盈亏。支持实时行情轮询与手动价格修正。
- **📝 交易记录**：精细化的交易录入系统，支持多选批量操作（删除、图表分析、AI 分析）。
- **🤖 AI 投资顾问**：
  - 深度集成 **DeepSeek (R1)** 模型。
  - 支持 **深度思考过程** 展示。
  - 具备联网搜索能力，结合最新市场资讯分析持仓风险。
  - 对话记录本地持久化，支持多对话管理。
- **📊 可视化分析**：一键生成交易成本曲线、收益曲线及汇总成本曲线。
- **🔍 智能搜索**：支持按代码、名称或标签（支持星标固定）快速过滤。
- **🔒 隐私安全**：所有数据（交易记录、AI 设置、搜索历史）均存储于浏览器本地 `localStorage`，不上传服务器。

## 快速开始

### 1. 本地运行

确保你已安装 [Node.js](https://nodejs.org/) (建议 v18+)。

```bash
# 克隆项目 (如果你是从 GitHub 下载的)
# git clone https://github.com/YOUR_USERNAME/stock-tracker.git
# cd stock-tracker

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

启动后访问 `http://localhost:5173`。

### 2. 配置 AI 助手

1. 点击 AI 助手页面左下角的 **⚙️ (设置)** 图标。
2. 输入你的 **DeepSeek API Key**。
3. 选择是否开启 **“深度思考 (R1)”** 或 **“联网搜索”**。
4. 保存后即可开始咨询。

## 项目部署

由于本项目是纯静态前端应用，你可以将其部署到任何支持静态托管的平台。

### 方式一：Vercel / Netlify (推荐)

1. 将代码上传到 GitHub。
2. 在 Vercel/Netlify 中关联该仓库。
3. 构建命令填入 `npm run build`，输出目录填入 `dist`。
4. 点击部署即可。

### 方式二：GitHub Pages

1. 在 `vite.config.ts` 中根据你的仓库名设置 `base` 路径。
2. 运行构建：
   ```bash
   npm run build
   ```
3. 将 `dist` 目录下的内容推送到仓库的 `gh-pages` 分支。

### 方式三：Docker 部署

1. 构建镜像：
   ```bash
   docker build -t stock-tracker .
   ```
2. 运行容器：
   ```bash
   docker run -d -p 80:80 stock-tracker
   ```

## 开发架构

- **前端框架**: React 19 (TypeScript)
- **构建工具**: Vite
- **状态管理**: React Hooks (useTrades, useStockQuote)
- **数据存储**: LocalStorage
- **AI 接口**: OpenAI 兼容协议 (Fetch API)

## 许可证

MIT License

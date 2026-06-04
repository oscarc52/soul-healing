# Handoff: Stillwater · 心湖 — 会话仪式与落地页交互

## Overview
Stillwater（心湖）是一款语音情绪疗愈产品。用户对着手机自由倾诉最多 60 秒，应用本地处理后返回"三份洞察"（你真正在纠结的 / 我注意到的模式 / 一个带走的问题）。

本交接包包含两部分设计：
1. **营销落地页**（hero、如何运作、核心功能、隐私承诺、用户心声、疗愈路径、footer）—— 在原有版本基础上做了**微交互升级**。
2. **核心会话仪式（Ritual）**—— 全新的、真实可交互的全屏会话流程，是这次交互重设计的核心。它把"说 60 秒 → 收到三份洞察"从一个静态展示变成了真实体验。

> 这次工作的重点是 **Ritual 全屏会话流程**。营销页其余区块基本沿用既有结构，只增量加了动效。

## About the Design Files
本包内的文件是**用 HTML/CSS/原生 JS 制作的设计参考**——展示目标外观与交互行为的高保真原型，**不是直接拷贝上线的生产代码**。

你的任务是在**目标代码库的既有技术栈**（React / Vue / SwiftUI / 原生等）中，用其既定的组件与模式**重新实现这些设计**；若项目尚无前端环境，则选择最合适的框架来实现。HTML 原型中的状态机、动画时序、麦克风接入逻辑可作为实现蓝本，但应翻译成目标框架的惯用写法（例如用 React state machine / XState 管理 Ritual 的四个阶段）。

## Fidelity
**High-fidelity（高保真）**。颜色、字体、间距、动画时序、交互状态均为最终值，请尽量像素级还原。下方"Design Tokens"给出全部精确数值。

---

## Screens / Views

### A. 营销落地页（marketing page）
单页滚动结构，区块顺序：Nav → Hero → Trust Strip → How → Features → Privacy → Voices → Directions → Footer。这部分沿用既有设计，仅做动效增量，详见"Interactions & Behavior · 营销页微交互"。关键新增：导航右侧的 **「开始会话」CTA 按钮**（`.nav-cta`），点击调用 `window.Ritual.open()` 进入会话仪式；Hero 主按钮「开始一次会话」同样调用它。

### B. 核心会话仪式 Ritual（全屏覆盖层）★ 重点
一个 `position:fixed; inset:0; z-index:300` 的全屏覆盖层，背景为不透明米色 `#FAF8F4` + 顶部柔和径向高光。一颗"会呼吸的光球"作为**贯穿全程的单一视觉元素**，在四个阶段间形态过渡。顶部固定栏：左 brand「心湖会话」、中 阶段进度点（3 点）、右 关闭按钮 ✕。底部有装饰性湖面涟漪（ambient ripples）。

仪式是一个**线性状态机**，四个阶段：

#### B1. 入静 settle（`data-stage="settle"`）
- **Purpose**: 用呼吸引导让用户慢下来，准备倾诉。
- **Layout**: 居中纵向堆叠：eyebrow「入静」→ prompt「先陪自己，深呼吸三次」→ sub 说明 → 中央光球 → 主按钮「我准备好了，开始说」。
- **行为**: 光球按 **4 秒吸气 / 4 秒呼气**（共 8 秒周期）正弦缩放（scale 0.82↔1.12），两圈 halo 同步缩放；光球中心文字在"吸气 / 呼气"间同步切换。由 `requestAnimationFrame` 驱动，公式见下。
- **出口**: 点主按钮 → speak。

#### B2. 倾诉 speak（`data-stage="speak"`）
- **Purpose**: 真实录音/倾诉，最长 60 秒。
- **Layout**: prompt「今天，什么在你心里？」（随时间柔和轮换文案）→ 中央光球被**环形声波 + 倒计时环**包围 → 计时器 `0:00 / 1:00` → 主按钮「说完了」→ 底部麦克风状态提示。
- **环形声波**: 围绕光球的 60 根细条（`.rt-bar`），均匀分布在半径 92px 的圆周上，由麦克风实时驱动高度（见 State Management · 麦克风）。
- **倒计时环**: SVG 圆环（r=138），`stroke-dashoffset` 随用时从满到空。
- **出口**: 点「说完了」或满 60 秒自动 → listen。

#### B3. 聆听 listen（`data-stage="listen"`）
- **Purpose**: 处理过渡（模拟"理解中"）。
- **Layout**: 声波收拢成静态、倒计时环清零、光球轻柔脉动；prompt 逐句轮换：`正在听见你… → 理解你说出的话 → 寻找话语之下的东西 → 准备三面小小的镜子`。
- **时长**: 约 4.6 秒后自动 → insight。**注意**：用 `setTimeout` 推进（即使页面失焦也会触发），不要依赖动画完成事件。

#### B4. 洞察 insight（`data-stage="insight"`）
- **Purpose**: 呈现三份洞察 + 收尾。
- **Layout**: prompt「这是此刻的你，在湖面上的倒影」→ 三张卡片纵向堆叠逐张滑入 → 保存提示「本次会话已存入你的心湖 · 仅你可见」→ 两个按钮「再说一次 / 把问题带走，完成」。光球缩小到角落作陪衬。
- **三张卡片**:
  1. 「一 · 你真正在纠结的」—— 一句洞察（serif 斜体）
  2. 「二 · 我注意到的模式」—— 一句模式观察
  3. 「三 · 带走的问题」—— 强调卡（`.rt-card.q`，sage 渐变底），一个开放式问题
- **出口**: 「再说一次」→ 重置回 settle；「完成」→ 关闭覆盖层。
- **内容来源**: 原型内置 4 组文案（`SETS` 数组），每次会话随机取一组。**生产中应替换为后端返回的真实洞察。**

---

## Interactions & Behavior

### 营销页微交互
- **滚动渐入**: `.reveal` 元素进入视口时 `opacity 0→1 / translateY(34px→0)`，`0.9s cubic-bezier(.22,1,.36,1)`，`IntersectionObserver` 触发，阈值 0.12，触发后 `unobserve`，同组元素 70ms stagger。
- **如何运作 步骤↔手机同步**: 左侧三步（`.step`），右侧手机预览（`.phone-screen`，三屏：倾诉 / 三份洞察 / 第30天心湖）。当前 active 步与对应手机屏同步切换；每 5 秒自动轮播（`setInterval`），手动点击某步会重置计时器。active 步左侧有竖向 accent 条 `scaleY` 入场、步骤条进度填充动画。
- **疗愈路径 Tab**: 三个 tab 用一个绝对定位的 `.dir-glider` 滑块在底部平滑滑动（`transform/width` 过渡 0.45s），面板交叉淡入。
- **导航**: 链接 hover 下划线 `width 0→100%`；向下滚动 >200px 时导航上移隐藏（`translateY(-100%)`），向上滚动复现。
- **Hero 指针光晕**: 指针在 hero 内移动时，一个柔光球（`.hero-glow`）跟随指针；hero 背景做轻微视差位移（±14px）。
- **按钮**: 主按钮 hover 上移 2px + sage 阴影，内部小圆点变白发光。

### Ritual 动画时序（精确值）
| 元素 | 属性 | 时长 / 缓动 |
|---|---|---|
| 呼吸周期 | scale 0.82↔1.12 | 8s（4s 吸 / 4s 呼），正弦 + easeInOut |
| 阶段内容入场 `.rt-stage` | translateY(20px→0) | 0.9s cubic-bezier(.22,1,.36,1)，**仅 transform，不含 opacity** |
| 洞察卡入场 `.rt-card` | translateY(26px→0) scale(.985→1) | 0.85s cubic-bezier(.22,1,.36,1)，逐张 stagger ~900ms |
| 倒计时环 | stroke-dashoffset | 每帧线性，总 60s |
| prompt 文案切换 | opacity 0→1 + 文字替换 | ~0.45s |
| 阶段进度点 | width 6px→22px | 0.5s cubic-bezier(.22,1,.36,1) |
| listen → insight | setTimeout | 4600ms |

> **重要实现原则（渐进增强）**: 入场动画只用 **transform**，静止态 `opacity:1`。这样即使页面失焦（`document.hidden` 暂停 CSS 动画）内容也始终可见，绝不会卡在隐藏态。请在目标实现中沿用此原则，并尊重 `prefers-reduced-motion`。

### 关闭
顶部 ✕ 或 `Esc` 键关闭；关闭时清理麦克风轨道与 AudioContext，恢复 `body` 滚动。

---

## State Management

### Ritual 状态机
- `stage`: `'settle' | 'speak' | 'listen' | 'insight' | 'closed'`
- `selectedSet`: 当前会话的洞察内容（原型为随机；生产为后端返回）
- 计时: `speakStart`（时间戳）、`speakDur = 60`（秒）
- 推进规则:
  - `settle → speak`: 用户点「我准备好了」
  - `speak → listen`: 用户点「说完了」**或** 用时达 60s
  - `listen → insight`: 4.6s 后自动（setTimeout）
  - `insight → settle`: 「再说一次」（重置视觉）
  - `insight → closed`: 「完成」

### 麦克风（环形声波）
- 通过 `navigator.mediaDevices.getUserMedia({audio:true})` 申请；成功则建 `AudioContext` + `AnalyserNode`（`fftSize=128`, `smoothingTimeConstant=0.78`），每帧 `getByteFrequencyData` 映射到 60 根声波条的高度（6–52px），并按响度切换颜色（>0.55 用深 sage，否则浅 sage）。光球本身随整体响度轻微脉动（scale 1→1.16）。
- **降级**: 若用户拒绝授权或无麦克风，自动改用平滑正弦模拟波形，流程不中断；底部提示文案随之切换。
- **隐私**: 文案强调"设备本地处理，不上传"。生产实现请确保真实满足此承诺（设备端转录），否则不要保留该文案。
- 结束时务必 `stream.getTracks().forEach(t=>t.stop())` 并 `audioCtx.close()`。

### 数据需求（生产）
- 录音 → 转写（设计承诺为**设备端**本地转写，不上传服务器）
- 转写文本 → 生成三份洞察（结构：`{ struggle, pattern, question }`）
- 跨会话存储以支持"思维模式追踪 / 情绪可视化 / 第30天"等功能（本地加密存储，可一键删除——见隐私承诺区块）

---

## Design Tokens

### Colors
```
--sage:#8A9E8C  --sage-light:#C5D4C2  --sage-pale:#EFF4EE
--stone:#B8A99A --stone-light:#DDD3CB --stone-pale:#F5F0EC
--ink:#2C2C2A   --ink-soft:#4A4845   --mist:#7A8A88
--cream:#FAF8F4 --white:#FEFEFE      --warm:#E8A87C
```
方向色（疗愈路径强调色）：A 情绪释放 = sage 系；B 数据洞察 = `#185FA5`（边 `#B5D4F4`）；C 匿名共鸣 = `#993556`（边 `#F4C0D1`）；图表紫 `#534AB7`。

光球渐变：`radial-gradient(circle at 38% 34%, #FBFDFB 0%, #DCE7DB 42%, #9DB29E 100%)`，外阴影 `0 20px 60px rgba(138,158,140,.4)` + 内阴影塑形。

### Typography
- Serif（标题 / 洞察 / 光球字）: `'Lora','Noto Serif SC',serif`
- Body（正文 / UI）: `'Noto Sans SC',sans-serif`，默认 `font-weight:300; line-height:1.8`
- Hero 标题: `clamp(2.8rem,7vw,5.5rem)`；区块标题: `clamp(1.8rem,4vw,2.8rem)`；Ritual prompt: `clamp(1.5rem,3.4vw,2.1rem)`
- 小标签字距: `letter-spacing:0.15–0.22em; text-transform:uppercase`

### Spacing / Radius / Shadow
- 区块纵向 padding `7rem`；容器 `max-width:1100px`
- 圆角: 卡片 `1.3–1.5rem`，按钮/标签 `100px`（胶囊），光球/头像 `50%`
- 卡片阴影（hover）: `0 24px 60px rgba(138,158,140,.16)`
- 通用缓动: `cubic-bezier(.22,1,.36,1)`

### Ritual 关键尺寸
- 中央舞台容器 `.rt-center` 300×300（移动端 260×260）
- 光球 150×150（移动端 130×130）
- 声波: 60 根，宽 3px，分布半径 92px，高 6–52px
- 倒计时环: r=138, stroke-width 3, 周长 `2π·138`

---

## Assets
- **字体**: Google Fonts — Noto Serif SC (300/400/500)、Lora (400/500 + italic)、Noto Sans SC (300/400)。生产中按目标平台改用本地/CDN 字体。
- **图标**: 当前用少量 emoji（🎙 🧠 🔒 ⏱ 🌊 ❓ 🕯 📊 🌐 等）作占位。生产建议替换为统一的线性图标集（与品牌调性一致的细线 sage 图标）。
- **图片**: 无真实图片；手机预览、图表、气泡均为纯 CSS 绘制。
- 无第三方品牌资产。

## Files
- `心湖 · 交互重设计.html` —— 营销页 + 所有页面样式（含内联 CSS）+ 营销页微交互脚本。Ritual 覆盖层的挂载点为 `<div id="ritual"></div>`。
- `ritual.js` —— 会话仪式的全部逻辑与样式（自挂载：注入 `<style>` 与 markup，暴露 `window.Ritual.open()/close()`）。四阶段状态机、呼吸驱动、麦克风环形声波、倒计时、洞察渲染都在这里。
- `uploads/soul-healing-website.html` —— 原始版本（改造前），仅供对照。

入口约定：营销页任意「开始会话 / 开始一次会话」按钮 → `window.Ritual.open()`。

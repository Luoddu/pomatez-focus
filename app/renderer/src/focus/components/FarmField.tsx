import React, { useEffect, useState } from "react";
import {
  PLANT_STAGES,
  QUADRANT_TONES,
  QuadrantKey,
  Season,
  beijingHour,
  mixColor,
  totalMilestone,
  weekHarvest,
} from "../week";
import {
  TermOverlay,
  seasonOfTerm,
  termInfo,
  termOverlay,
} from "../solarTerms";

// 布局：土壤带集中在地面层中央（100..680），株位在带内；
// 收获果筐在左侧空白区（不压土壤带），稻草人守右侧带缘
const PLANTS = [205, 262, 319, 376, 433, 490, 547, 604];
const GROUND = 120;
const STARS: [number, number][] = [
  [8, 12],
  [28, 7],
  [46, 18],
  [65, 9],
  [80, 21],
  [93, 11],
];
const BUTTERFLIES: [number, number][] = [
  [150, 54],
  [560, 42],
];
const FIREFLIES: [number, number][] = [
  [130, 88],
  [330, 98],
  [560, 82],
];
// 株序种子伪随机：同一株每次渲染形态稳定，不用 Math.random
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 果体哑光径向渐变：中心主色 → 边缘略深（16% 黑）；坐果青绿也有一只。
// 仓库验收要求哑光无白色高光点（scripts/shot-app.cjs），立体感靠
// 渐变压深 + 每颗果实的确定性形态微差（大小/椭圆比/倾角/萼片）呈现
const TOMATO_GRADS: [string, string][] = [
  ...(Object.entries(QUADRANT_TONES) as [string, string][]),
  ["unripe", "#7fbf6b"],
];
const GRAD_BY_TONE: Record<string, string> = Object.fromEntries(
  TOMATO_GRADS.map(([k, tone]) => [tone, `farm-tomato-${k}`])
);
const TomatoDefs = () => (
  <defs>
    {TOMATO_GRADS.map(([k, tone]) => (
      <radialGradient key={k} id={`farm-tomato-${k}`} cx="42%" cy="32%" r="78%">
        <stop offset="0%" stopColor={tone} />
        <stop offset="55%" stopColor={tone} />
        <stop offset="100%" stopColor={mixColor(tone, "#000000", 0.16)} />
      </radialGradient>
    ))}
  </defs>
);

// 番茄果实：哑光径向渐变果体 + 星形萼片。seed 派生确定性形态微差——
// 大小 ±13%、宽高比 0.92~1.08、倾斜 ±9°、萼片 3~4 片角度/长度微差；
// 同一颗番茄（同 seed）每次渲染形态一致，不闪变
const Tomato = ({
  x,
  y,
  r = 6,
  tone,
  seed = 0,
  pop = false,
}: {
  x: number;
  y: number;
  r?: number;
  tone: string;
  seed?: number;
  pop?: boolean; // 新入筐时播放一次弹跳（靠 key 重挂载触发）
}) => {
  const rr = r * (0.87 + rand(seed, 1) * 0.28);
  const ratio = 0.92 + rand(seed, 2) * 0.16;
  const rx = rr * Math.sqrt(ratio);
  const ry = rr / Math.sqrt(ratio);
  const tilt = (rand(seed, 3) - 0.5) * 18;
  const spokes = rand(seed, 4) > 0.45 ? 3 : 4;
  const sepals = Array.from({ length: spokes }, (_, k) => {
    const a =
      ((-90 + (k - (spokes - 1) / 2) * (30 + rand(seed, 11 + k) * 16)) *
        Math.PI) /
      180;
    const len = 2.4 + rand(seed, 21 + k) * 1.4;
    return `M${x} ${(y - ry).toFixed(2)} l${(Math.cos(a) * len).toFixed(2)} ${(
      Math.sin(a) * len
    ).toFixed(2)}`;
  }).join(" ");
  return (
    <g transform={`rotate(${tilt.toFixed(1)} ${x} ${y})`}>
      <path
        d={sepals}
        stroke="#3f7d44"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <ellipse
        className={pop ? "farm-tomato-pop" : undefined}
        cx={x}
        cy={y}
        rx={rx.toFixed(2)}
        ry={ry.toFixed(2)}
        fill={GRAD_BY_TONE[tone] ? `url(#${GRAD_BY_TONE[tone]})` : tone}
      />
    </g>
  );
};

// 番茄花是黄色星形小花：5 片尖花瓣 + 深色花心
const StarFlower = ({
  x,
  y,
  s = 1,
}: {
  x: number;
  y: number;
  s?: number;
}) => {
  const points = Array.from({ length: 10 }, (_, k) => {
    const radius = k % 2 ? 2.1 * s : 5.6 * s;
    const angle = (k * 36 - 90) * (Math.PI / 180);
    return `${(x + radius * Math.cos(angle)).toFixed(2)},${(
      y +
      radius * Math.sin(angle)
    ).toFixed(2)}`;
  }).join(" ");
  return (
    <g>
      <polygon points={points} fill="#f7d154" />
      <circle cx={x} cy={y} r={1.7 * s} fill="#e8a13d" />
    </g>
  );
};

const Leaf = ({
  x,
  y,
  angle,
  size,
  tone,
}: {
  x: number;
  y: number;
  angle: number;
  size: number;
  tone: string;
}) => (
  <ellipse
    cx={x}
    cy={y}
    rx={size}
    ry={size * 0.55}
    fill={tone}
    transform={`rotate(${angle} ${x} ${y})`}
  />
);

// 成株的羽状复叶：一条叶轴 + 3 对小叶 + 顶生小叶（局部原点叶基，向上生长）
const CompoundLeaf = ({
  x,
  y,
  angle,
  len,
  tone,
}: {
  x: number;
  y: number;
  angle: number;
  len: number;
  tone: string;
}) => (
  <g transform={`translate(${x} ${y}) rotate(${angle})`}>
    <path
      d={`M0 0 L0 ${-len}`}
      stroke={tone}
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    {[0.38, 0.64, 0.86].map((t) => (
      <g key={t}>
        <ellipse
          cx={-3.4}
          cy={-len * t}
          rx={3.6}
          ry={1.9}
          fill={tone}
          transform={`rotate(-32 ${-3.4} ${-len * t})`}
        />
        <ellipse
          cx={3.4}
          cy={-len * t - 1.5}
          rx={3.6}
          ry={1.9}
          fill={tone}
          transform={`rotate(32 3.4 ${-len * t - 1.5})`}
        />
      </g>
    ))}
    <ellipse cx={0} cy={-len - 2} rx={2.2} ry={3.4} fill={tone} />
  </g>
);

const Bird = ({ x, y }: { x: number; y: number }) => (
  <path
    d={`M${x} ${y} q4 -4.5 8 0 q4 -4.5 8 0`}
    stroke="#8a8f99"
    strokeWidth="1.6"
    fill="none"
    strokeLinecap="round"
  />
);

// 天空层（HTML 绝对定位，随卡片高度舒展）：色温渐变底 + 太阳/月亮沿
// 弧线按北京时间连续移动（窗口越高弧线越高）、云/鸟/星星按百分比分布。
// 不做真实天气（渲染进程 CSP 禁网且没有天气 API key），只做时间驱动光照。
const SKY_TINTS: [number, string, number][] = [
  [0, "#2b3a6b", 0.22],
  [4.5, "#2b3a6b", 0.22],
  [6, "#f2994a", 0.14],
  [8, "#bcd8ec", 0.08],
  [12, "#bfe3f2", 0.12],
  [16, "#bcd8ec", 0.08],
  [18.5, "#f2994a", 0.16],
  [20, "#2b3a6b", 0.22],
  [24, "#2b3a6b", 0.22],
];
const skyTint = (h: number) => {
  for (let i = 0; i < SKY_TINTS.length - 1; i++) {
    const [h0, c0, o0] = SKY_TINTS[i],
      [h1, c1, o1] = SKY_TINTS[i + 1];
    if (h >= h0 && h <= h1) {
      const t = (h - h0) / (h1 - h0);
      return { color: mixColor(c0, c1, t), opacity: o0 + (o1 - o0) * t };
    }
  }
  return { color: "#2b3a6b", opacity: 0.22 };
};
const rgba = (hex: string, alpha: number) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
};
const Sky = ({ now }: { now: number }) => {
  const h = beijingHour(now);
  const tint = skyTint(h);
  const day = h >= 6 && h < 18.5;
  const t = day ? (h - 6) / 12.5 : ((h - 18.5 + 24) % 24) / 11.5;
  const altitude = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
  const bodyLeft = 8 + t * 84;
  const bodyTop = 10 + (1 - altitude) * 52;
  const sun = mixColor("#f2994a", "#ffd45e", Math.min(1, altitude * 1.6));
  return (
    <>
      <div
        className="farm-sky"
        style={{
          background: `linear-gradient(180deg, ${rgba(
            tint.color,
            tint.opacity * 1.6
          )}, ${rgba(tint.color, tint.opacity * 0.3)} 70%, transparent)`,
        }}
      />
      {day ? (
        <div
          className="farm-sun"
          style={{
            left: `${bodyLeft}%`,
            top: `${bodyTop}%`,
            background: `radial-gradient(circle at 38% 32%, ${mixColor(
              sun,
              "#ffffff",
              0.5
            )}, ${sun})`,
            boxShadow: `0 0 0 5px ${rgba(sun, 0.4)}, 0 0 0 11px ${rgba(
              sun,
              0.18
            )}`,
          }}
        />
      ) : (
        <>
          <div
            className="farm-moon"
            style={{ left: `${bodyLeft}%`, top: `${bodyTop}%` }}
          />
          {(h >= 19.5 || h < 5) &&
            STARS.map(([sx, sy]) => (
              <span
                key={`${sx}-${sy}`}
                className="farm-star"
                style={{ left: `${sx}%`, top: `${sy}%` }}
              />
            ))}
        </>
      )}
      <div className="farm-cloud" style={{ left: "13%", top: "12%" }} />
      <div
        className="farm-cloud small"
        style={{ left: "66%", top: "7%", animationDelay: "-13s" }}
      />
      {day && h >= 7 && h < 17 && (
        <svg className="farm-birds" viewBox="0 0 720 60" preserveAspectRatio="xMidYMin meet">
          <Bird x={330} y={22} />
          <Bird x={372} y={34} />
        </svg>
      )}
    </>
  );
};

// 稻草人：立在土壤带右缘的可爱看守，local 原点在杆底；冬天戴红围巾
const Scarecrow = ({ x, scarf = false }: { x: number; scarf?: boolean }) => (
  <g
    className="farm-scarecrow"
    transform={`translate(${x} 18) scale(.85)`}
  >
    <rect x="-2.5" y="86" width="5" height="34" rx="2" fill="#a9763f" />
    {scarf && (
      <>
        <path d="M-9 70.5 Q0 75.5 9 70.5 L8 78 L2 75.5 L-7 79 Z" fill="#d9564a" />
        <path d="M2 75.5 l5 13 l4 -1.5 l-4.5 -12.5 Z" fill="#c94337" />
      </>
    )}
    <path
      d="M-22 76 L22 76"
      stroke="#a9763f"
      strokeWidth="4"
      strokeLinecap="round"
    />
    {/* 袖口稻草 */}
    <path
      d="M-22 76 l-5 -3 M-22 76 l-6 1 M-22 76 l-4 4"
      stroke="#f7d154"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M22 76 l5 -3 M22 76 l6 1 M22 76 l4 4"
      stroke="#f7d154"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* 衣服 */}
    <path
      d="M-11 78 L-9 100 L9 100 L11 78 Q0 73 -11 78 Z"
      fill="#ec9bb6"
    />
    <circle cx="0" cy="86" r="1.6" fill="#fff" opacity=".8" />
    <circle cx="0" cy="93" r="1.6" fill="#fff" opacity=".8" />
    {/* 脑袋 */}
    <circle cx="0" cy="64" r="10" fill="#f7d154" />
    <circle cx="-3.2" cy="63" r="1.2" fill="#7a4f21" />
    <circle cx="3.2" cy="63" r="1.2" fill="#7a4f21" />
    <path
      d="M-3 67.5 Q0 70.5 3 67.5"
      stroke="#7a4f21"
      strokeWidth="1.4"
      fill="none"
      strokeLinecap="round"
    />
    {/* 草帽 */}
    <ellipse cx="0" cy="55.5" rx="12.5" ry="3.4" fill="#e8a13d" />
    <path d="M-7 55.5 Q0 41 7 55.5 Z" fill="#e8a13d" />
  </g>
);

// ── 季节时令层：按北京时间月份叠克制的小装饰，有变化但不打扰专注 ──
// 春(3–5)飘花瓣、夏(6–8)蜻蜓点水、秋(9–11)落叶、冬(12–2)落雪 + 雪地
const PETALS: [number, number][] = [
  [175, 62],
  [295, 44],
  [425, 74],
  [555, 52],
  [640, 84],
];
const LEAVES: [number, number][] = [
  [160, 58],
  [285, 78],
  [410, 48],
  [545, 72],
  [655, 56],
];
const SNOWFLAKES: [number, number][] = [
  [140, 40],
  [255, 66],
  [370, 36],
  [490, 70],
  [605, 44],
  [680, 78],
];
const Dragonfly = () => (
  <g className="farm-dragonfly" transform="translate(520 66)">
    <line x1="0" y1="0" x2="0" y2="12" stroke="#5b7f99" strokeWidth="1.6" strokeLinecap="round" />
    <ellipse className="farm-wing" cx="-4" cy="-2" rx="5" ry="1.8" fill="#bcd8ec" opacity=".85" />
    <ellipse className="farm-wing right" cx="4" cy="-2" rx="5" ry="1.8" fill="#bcd8ec" opacity=".85" />
    <circle cx="0" cy="-3" r="1.6" fill="#5b7f99" />
  </g>
);
const SeasonLayer = ({ season }: { season: Season }) => {
  if (season === "spring")
    return (
      <>
        {PETALS.map(([px, py], i) => (
          <g key={`${px}-${py}`} transform={`translate(${px} ${py})`}>
            <g
              className="farm-season-item"
              style={{
                animationDelay: `${-i * 1.7}s`,
                animationDuration: `${6.5 + (i % 3)}s`,
              }}
            >
              <ellipse
                cx="0"
                cy="0"
                rx="3.2"
                ry="1.9"
                fill="#f5c9d4"
                transform={`rotate(${30 + i * 40})`}
              />
            </g>
          </g>
        ))}
      </>
    );
  if (season === "summer") return <Dragonfly />;
  if (season === "autumn")
    return (
      <>
        {LEAVES.map(([lx, ly], i) => (
          <g key={`${lx}-${ly}`} transform={`translate(${lx} ${ly})`}>
            <g
              className="farm-season-item"
              style={{
                animationDelay: `${-i * 1.3}s`,
                animationDuration: `${7.5 + (i % 3)}s`,
              }}
            >
              <path
                d="M0 0 Q3.4 -4.5 0 -9 Q-3.4 -4.5 0 0 Z"
                fill={i % 2 ? "#e8a13d" : "#d96b4a"}
                transform={`rotate(${-20 + i * 25})`}
              />
            </g>
          </g>
        ))}
      </>
    );
  // winter：雪花落在土壤带上（在组件调用处叠加雪地）
  return (
    <>
      {SNOWFLAKES.map(([sx, sy], i) => (
        <g key={`${sx}-${sy}`} transform={`translate(${sx} ${sy})`}>
          <g
            className="farm-season-item snow"
            style={{
              animationDelay: `${-i * 1.1}s`,
              animationDuration: `${8 + (i % 3)}s`,
            }}
          >
            <circle cx="0" cy="0" r="2.1" fill="#ffffff" opacity=".95" />
            <path
              d="M-3.4 0 L3.4 0 M0 -3.4 L0 3.4"
              stroke="#ffffff"
              strokeWidth=".9"
              opacity=".8"
            />
          </g>
        </g>
      ))}
    </>
  );
};

// ── 节气点景层：在四季层之上叠加节气特有的小装饰 ──
// 雨水/清明/谷雨 细雨、白露/寒露 叶尖露珠、霜降 土壤薄霜（霜的地面覆白在
// 组件调用处与雪地同位渲染）
const RAIN_DROPS: [number, number][] = [
  [150, 30],
  [230, 55],
  [320, 36],
  [410, 60],
  [500, 34],
  [590, 58],
  [665, 40],
];
const DEW_DROPS: [number, number][] = [
  [228, 104],
  [300, 110],
  [388, 102],
  [452, 112],
  [530, 105],
  [612, 110],
];
const TermOverlayLayer = ({ overlay }: { overlay: TermOverlay }) => {
  if (overlay === "rain")
    return (
      <>
        {RAIN_DROPS.map(([rx, ry], i) => (
          <line
            key={`${rx}-${ry}`}
            className="farm-rain"
            x1={rx}
            y1={ry}
            x2={rx - 3}
            y2={ry + 7}
            style={{
              animationDelay: `${-i * 0.9}s`,
              animationDuration: `${2.6 + (i % 3) * 0.5}s`,
            }}
          />
        ))}
      </>
    );
  if (overlay === "dew")
    return (
      <>
        {DEW_DROPS.map(([dx, dy], i) => (
          <circle
            key={`${dx}-${dy}`}
            className="farm-dew"
            cx={dx}
            cy={dy}
            r="1.6"
            style={{ animationDelay: `${i * 0.7}s` }}
          />
        ))}
      </>
    );
  return null;
};

// 一株番茄的某个生长阶段（局部原点在株基）。形态参考真实番茄生长过程。
// 坐果的果实是青绿的（未熟）；转色开始染象限色；红熟整果按本周收获
// 的象限分布着色——一眼看出这周红番茄多还是灰番茄多
const Plant = ({
  index,
  stage,
  extraFruit,
  toneAt,
}: {
  index: number;
  stage: number; // 0 发芽 … 6 红熟
  extraFruit: number;
  toneAt: (k: number) => string;
}) => {
  if (stage === 0)
    // 发芽：两片子叶对生，还没真叶
    return (
      <>
        <path
          d="M0 0 q1 -6 0 -8"
          stroke="#6fbc73"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <Leaf x={-4.5} y={-8} angle={-32} size={5} tone="#6fbc73" />
        <Leaf x={4.5} y={-8} angle={32} size={5} tone="#6fbc73" />
      </>
    );
  if (stage === 1)
    // 幼苗：子叶留在低位，抽出 2-3 片真叶
    return (
      <>
        <path
          d="M0 0 q-1 -10 0 -17"
          stroke="#58a55c"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />
        <Leaf x={-4} y={-4} angle={-28} size={4} tone="#6fbc73" />
        <Leaf x={4} y={-4} angle={28} size={4} tone="#6fbc73" />
        <Leaf x={-6.5} y={-11} angle={-30} size={6} tone="#58a55c" />
        <Leaf x={6.5} y={-14} angle={30} size={6} tone="#58a55c" />
        <Leaf x={0} y={-19} angle={0} size={4.5} tone="#58a55c" />
      </>
    );
  // 成株起：茎粗壮 + 羽状复叶
  const tall = stage >= 4;
  const stemH = tall ? 46 : 34;
  const leaves = 3 + Math.floor(rand(index, 5) * 2);
  const fruitTone = (k: number) =>
    stage === 4
      ? "#7fbf6b" // 坐果一律青绿（未熟）
      : stage === 5
      ? rand(index, 61 + k) > 0.45
        ? toneAt(k)
        : "#7fbf6b"
      : toneAt(k);
  // 坐果起每株 3 个基础果位；红熟后超出周产能的番茄加成额外果实（更繁茂）
  const slots =
    stage >= 4
      ? [
          { x: -9, y: -(stemH - 12) },
          { x: 8, y: -(stemH - 20) },
          { x: -2, y: -(stemH - 30) },
          ...Array.from({ length: Math.min(extraFruit, 6) }, (_, k) => ({
            x: (rand(index, 71 + k) - 0.5) * 26,
            y: -(14 + rand(index, 81 + k) * (stemH - 18)),
          })),
        ]
      : [];
  return (
    <>
      <path
        d={`M0 0 C ${tall ? -12 : -8} ${-stemH * 0.45}, ${
          tall ? 10 : 6
        } ${-stemH * 0.7}, 0 ${-stemH}`}
        stroke="#3f7d44"
        strokeWidth={tall ? 4.5 : 4}
        fill="none"
        strokeLinecap="round"
      />
      {Array.from({ length: leaves }, (_, k) => {
        const side = k % 2 ? 1 : -1;
        return (
          <CompoundLeaf
            key={k}
            x={side * (4 + rand(index, 21 + k) * 3)}
            y={-(10 + (k * (stemH - 14)) / leaves)}
            angle={side * (30 + rand(index, 31 + k) * 12)}
            len={9 + rand(index, 41 + k) * 3}
            tone={k % 2 ? "#6fbc73" : "#58a55c"}
          />
        );
      })}
      {stage === 3 && (
        <>
          <StarFlower x={0} y={-stemH - 4} />
          <StarFlower x={7} y={-stemH + 2} s={0.8} />
          {rand(index, 51) > 0.4 && (
            <StarFlower x={-7} y={-stemH + 3} s={0.75} />
          )}
        </>
      )}
      {stage >= 4 && (
        <>
          {slots.map((s, k) => (
            <Tomato key={k} x={s.x} y={s.y} tone={fruitTone(k)} seed={index * 31 + k} />
          ))}
          {stage === 4 && <StarFlower x={5} y={-stemH - 2} s={0.7} />}
        </>
      )}
    </>
  );
};

// 收获筐：卡片左侧空白区（不压土壤带）。筐里果堆随累计收获逐层长高
// （最多 21 颗六层堆尖），每收一颗新番茄从顶部弹跳入筐（key 重挂载触发
// 一次性动画，老番茄不重播）；30/100 颗时两侧各多出一只小筐，堆尖之上挂
// 金星级程碑旗（50/100/200/…）。准确数量以「累计收获 N」文字为准
const PILE_CAP = 21;
const pileSlots = (): [number, number][] => {
  const slots: [number, number][] = [];
  for (let row = 0; row < 6; row++) {
    const count = 6 - row;
    const y = -18 - row * 7.6;
    for (let k = 0; k < count; k++)
      slots.push([(k - (count - 1) / 2) * 11.4, y]);
  }
  return slots;
};
const PILE_SLOTS = pileSlots();

const MiniBasket = ({
  x,
  toneAt,
  seed,
}: {
  x: number;
  toneAt: (k: number) => string;
  seed: number;
}) => (
  <g transform={`translate(${x} -2) scale(.52)`}>
    <path d="M-24 -12 L24 -12 L19 6 L-19 6 Z" fill="#b07840" />
    <rect x="-27" y="-16" width="54" height="7" rx="3.5" fill="#a9763f" />
    <Tomato x={-9} y={-20} r={6} tone={toneAt(seed)} seed={seed * 7} />
    <Tomato x={4} y={-22} r={6} tone={toneAt(seed + 1)} seed={seed * 7 + 1} />
    <Tomato x={-2} y={-29} r={6} tone={toneAt(seed + 2)} seed={seed * 7 + 2} />
  </g>
);

// 里程碑金星旗：堆尖上方的小旗帜，旗面数字为已达成的最大档
const MilestoneFlag = ({ reached }: { reached: number }) =>
  reached >= 50 ? (
    <g transform="translate(0 -72)">
      <line x1="0" y1="10" x2="0" y2="-2" stroke="#a9763f" strokeWidth="1.8" />
      <path d="M0 -2 L15 -2 L12.5 3 L15 8 L0 8 Z" fill="#f2b544" />
      <text className="farm-flag-text" x="5.5" y="5.4" textAnchor="middle">
        {reached}
      </text>
    </g>
  ) : null;

const Pile = ({
  total,
  toneAt,
}: {
  total: number;
  toneAt: (k: number) => string;
}) => {
  const n = Math.max(0, Math.floor(total));
  const shown = Math.min(n, PILE_CAP);
  const milestone = totalMilestone(n);
  const sideBaskets = n >= 100 ? 2 : n >= 30 ? 1 : 0;
  return (
    <g className="farm-pile" transform="translate(44 118)">
      {/* 立在卡片留白上的淡淡地影，不接地壤带 */}
      <ellipse cx="6" cy="5" rx="46" ry="5" fill="#7a4f21" opacity=".08" />
      {sideBaskets > 0 && <MiniBasket x={-32} toneAt={toneAt} seed={30} />}
      {sideBaskets > 1 && <MiniBasket x={46} toneAt={toneAt} seed={33} />}
      {/* 编织筐：筐身 + 两道织纹 + 提手 */}
      <path d="M-32 -14 L32 -14 L25 5 L-25 5 Z" fill="#b07840" />
      <path d="M-29.5 -8 L29.5 -8" stroke="#9c6733" strokeWidth="1.6" opacity=".7" />
      <path d="M-27 -2 L27 -2" stroke="#9c6733" strokeWidth="1.6" opacity=".7" />
      <rect x="-35" y="-18" width="70" height="7" rx="3.5" fill="#a9763f" />
      <path
        d="M-20 -18 Q0 -34 20 -18"
        stroke="#a9763f"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {PILE_SLOTS.slice(0, shown).map(([sx, sy], k) => (
        // key=k：堆高时新番茄挂载触发弹跳，既有番茄不重播
        <Tomato key={k} x={sx} y={sy} r={5.4} tone={toneAt(k)} seed={200 + k} pop />
      ))}
      {n > PILE_CAP && (
        <g transform="translate(30 -52)">
          <rect x="-14" y="-9" width="30" height="15" rx="7.5" fill="#f2b544" />
          <text className="farm-flag-text" x="1" y="2.4" textAnchor="middle">
            +{n - PILE_CAP}
          </text>
        </g>
      )}
      <MilestoneFlag reached={milestone.reached} />
      <text className="farm-pile-text" x="6" y="18" textAnchor="middle">
        累计收获 {n}
      </text>
    </g>
  );
};

export default function FarmField({
  total,
  week,
  tones,
  pileTones,
  now,
}: {
  total: number;
  week: number;
  tones: QuadrantKey[]; // 本周收获的象限色序列（田里果实用）
  pileTones: QuadrantKey[]; // 累计收获的象限色序列（果筐堆用）
  now?: number;
}) {
  // 天空实时性：无 ?farmNow mock 时每 60s（及窗口重新聚焦/恢复可见时）
  // 重算一次北京时间，只触发本卡片子树更新；mock 模式冻结时刻不起定时器
  const [liveNow, setLiveNow] = useState(() => Date.now());
  useEffect(() => {
    if (now !== undefined) return;
    const refresh = () => setLiveNow(Date.now());
    const t = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [now]);
  const at = now ?? liveNow;
  const bh = beijingHour(at);
  // 节气驱动：季节从「月份估算」升级为真实节气（立春–谷雨=春…），
  // 并叠加节气点景（细雨/露珠/薄霜）；pill 展示当前节气与下一节气倒计时
  const term = termInfo(at);
  const season = seasonOfTerm(term.index);
  const overlay = termOverlay(term.index);
  const butterfliesOut = bh >= 8 && bh < 17; // 蝴蝶白天
  const firefliesOut = bh >= 19.5 || bh < 6; // 萤火虫夜晚
  const harvest = weekHarvest(week);
  const caption =
    harvest.plants === 0
      ? `空地 · 本周还没种 · 完成 1 个番茄就发芽 · 累计收获 ${total}`
      : `${harvest.stage} · 本周已收 ${week} 个 · 田里 ${harvest.plants} 株 · 累计收获 ${total} · 周日翻篇`;
  // 象限色按下标循环取近似比例；无记录时回退经典番茄红
  const toneFrom = (list: QuadrantKey[]) => (k: number) =>
    list.length ? QUADRANT_TONES[list[k % list.length]] : "#e57368";
  const fieldTone = toneFrom(tones);
  const pileTone = toneFrom(pileTones);
  // 红熟后超出的番茄摊成各株额外果实，靠前株优先
  const extraFruit = (i: number) =>
    harvest.bonus
      ? Math.floor(harvest.bonus / harvest.plants) +
        (i < harvest.bonus % harvest.plants ? 1 : 0)
      : 0;
  return (
    <div className="card farm-field">
      <div className="farm-caption">
        <span
          className="term-pill"
          title={`${term.name} · 第 ${term.dayOfTerm} 天 · ${
            term.daysToNext === 0
              ? `今天交 ${term.nextName}`
              : `${term.daysToNext} 天后交 ${term.nextName}`
          }`}
        >
          {term.emoji} {term.name} · 第 {term.dayOfTerm} 天
        </span>
        {caption}
      </div>
      {/* 分层场景：天空层随卡片高度舒展，地面层保持 720:150 比例锚底，
          窗口拉高时空白被天空有机吃掉而不拉伸变形 */}
      <div
        className="farm-scene"
        role="img"
        aria-label={`番茄园：${term.name}，${caption}`}
        data-sky={now === undefined ? "live" : "mock"}
        data-sky-hour={bh.toFixed(2)}
        data-term={term.name}
      >
        <Sky now={at} />
        {/* 内联原创 SVG 素材：渲染进程 CSP 禁网且规避外部素材许可证风险 */}
        <svg
          className="farm-land"
          viewBox="0 0 720 150"
          preserveAspectRatio="xMidYMax meet"
        >
          <TomatoDefs />
          {/* 远山树线：克制的背景填充，压在土壤带后方 */}
          <path
            d="M100 122 Q230 100 360 118 T680 116 L680 150 L100 150 Z"
            fill="#cfe0bd"
            opacity=".8"
          />
          <g opacity=".65">
            <circle cx="240" cy="106" r="5" fill="#9dc48a" />
            <rect x="239" y="108" width="2" height="7" fill="#8a9b6e" />
            <circle cx="420" cy="103" r="6" fill="#9dc48a" />
            <rect x="419" y="106" width="2" height="8" fill="#8a9b6e" />
            <circle cx="470" cy="108" r="4" fill="#9dc48a" />
            <rect x="469" y="110" width="2" height="6" fill="#8a9b6e" />
          </g>
          {/* 土壤带集中在卡片中央，两侧留白给果筐堆 */}
          <path
            className="farm-ground"
            d="M100 122 Q200 108 320 118 T560 116 T680 120 L680 150 L100 150 Z"
            fill="#d9a066"
          />
          <path
            d="M100 134 Q240 126 380 132 T680 130 L680 150 L100 150 Z"
            fill="#b07840"
            opacity=".45"
          />
          {/* 冬天：土壤带覆一层薄雪；霜降：更薄的一层霜 */}
          {season === "winter" && (
            <path
              d="M100 121 Q200 107 320 117 T560 115 T680 119 L680 131 Q560 125 420 129 T100 133 Z"
              fill="#ffffff"
              opacity=".75"
            />
          )}
          {overlay === "frost" && season !== "winter" && (
            <path
              d="M100 121 Q200 107 320 117 T560 115 T680 119 L680 131 Q560 125 420 129 T100 133 Z"
              fill="#f4fafd"
              opacity=".45"
            />
          )}
          {/* 小栅栏：土壤带左缘 */}
          <g className="farm-fence">
            <rect x="114" y="106" width="4" height="16" rx="1.5" fill="#c68b59" />
            <rect x="134" y="106" width="4" height="16" rx="1.5" fill="#c68b59" />
            <rect x="154" y="106" width="4" height="16" rx="1.5" fill="#c68b59" />
            <rect x="110" y="110" width="52" height="3" rx="1.5" fill="#d9a066" />
            <rect x="110" y="117" width="52" height="3" rx="1.5" fill="#d9a066" />
          </g>
          {/* 稻草人守在土壤带右缘；入冬戴上红围巾 */}
          <Scarecrow x={648} scarf={season === "winter"} />
          {Array.from({ length: harvest.plants }, (_, i) => {
            const scale = 0.85 + rand(i, 1) * 0.35;
            const tilt = (rand(i, 2) - 0.5) * 6;
            const dur = 3.2 + rand(i, 3) * 1.2;
            // 外层 g 静态高度/倾角，内层 sway 只负责动画 rotate，互不覆盖
            return (
              <g
                key={PLANTS[i]}
                transform={`translate(${PLANTS[i]} ${GROUND}) rotate(${tilt.toFixed(
                  2
                )}) scale(${scale.toFixed(3)})`}
              >
                <g
                  className="farm-sway"
                  style={{
                    animationDuration: `${dur.toFixed(2)}s`,
                    animationDelay: `${(-rand(i, 4) * dur).toFixed(2)}s`,
                  }}
                >
                  <Plant
                    index={i}
                    stage={harvest.steps[i] - 1}
                    extraFruit={extraFruit(i)}
                    toneAt={(k) => fieldTone(i * 3 + k)}
                  />
                </g>
              </g>
            );
          })}
          {butterfliesOut &&
            BUTTERFLIES.map(([bx, by], i) => (
            <g key={`${bx}-${by}`} transform={`translate(${bx} ${by})`}>
              <g
                className="farm-butterfly"
                style={{
                  animationDelay: `${-i * 2.3}s`,
                  animationDuration: `${7 + i * 1.6}s`,
                }}
              >
                <ellipse
                  className="farm-wing"
                  cx="-3.2"
                  cy="0"
                  rx="4"
                  ry="2.6"
                  fill={i ? "#f2b544" : "#ec9bb6"}
                />
                <ellipse
                  className="farm-wing right"
                  cx="3.2"
                  cy="0"
                  rx="4"
                  ry="2.6"
                  fill={i ? "#f2b544" : "#ec9bb6"}
                />
                <rect
                  x="-0.8"
                  y="-3"
                  width="1.6"
                  height="6"
                  rx="0.8"
                  fill="#7a4f21"
                />
              </g>
            </g>
          ))}
          {firefliesOut &&
            FIREFLIES.map(([fx, fy], i) => (
            <circle
              key={`${fx}-${fy}`}
              className="farm-firefly"
              cx={fx}
              cy={fy}
              r="2"
              fill="#e9f79b"
              style={{
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${2 + i * 0.4}s`,
              }}
            />
          ))}
          {/* 时令装饰：花瓣 / 蜻蜓 / 落叶 / 雪花，按真实节气换景；
              其上再叠节气点景（细雨 / 露珠） */}
          <SeasonLayer season={season} />
          <TermOverlayLayer overlay={overlay} />
          <Pile total={total} toneAt={pileTone} />
        </svg>
      </div>
    </div>
  );
}

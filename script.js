// 八大行星的顯示資料；軌道距離和大小採用方便觀察的示意比例。
const planets = [
  { name: "水星", color: "#b9a58e", highlight: "#e7d3b8", shade: "#62564d", size: 7, orbit: 0.115, period: 8.8, angle: 35, fact: "離太陽最近、體積最小的行星。", detail: "水星表面布滿隕石坑，白天與夜晚的溫差非常大。" },
  { name: "金星", color: "#e4b86f", highlight: "#ffe4a6", shade: "#9b6848", size: 11, orbit: 0.215, period: 22.5, angle: 205, fact: "夜空中最明亮的行星。", detail: "金星有濃厚的大氣層，是太陽系中表面溫度最高的行星。" },
  { name: "地球", color: "#4e9bdb", highlight: "#9ce5e8", shade: "#23517d", size: 12, orbit: 0.315, period: 36.5, angle: 120, fact: "目前已知唯一有生命的星球。", detail: "地球表面約七成被海洋覆蓋，並擁有適合生命存在的大氣與液態水。" },
  { name: "火星", color: "#d36f50", highlight: "#f1a17a", shade: "#783b36", size: 9, orbit: 0.415, period: 68.7, angle: 310, fact: "因紅色地表而有「紅色星球」之稱。", detail: "火星擁有太陽系中最大的火山，也有乾涸河床留下的地形。" },
  { name: "木星", color: "#d6aa7b", highlight: "#f2d1a2", shade: "#87634f", size: 23, orbit: 0.555, period: 433, angle: 70, fact: "太陽系體積最大的行星。", detail: "木星是氣體巨行星，大紅斑是一場持續數百年的巨大風暴。" },
  { name: "土星", color: "#d5c08c", highlight: "#f5e4b2", shade: "#867451", size: 19, orbit: 0.705, period: 1075, angle: 250, fact: "以壯觀的冰與岩石光環聞名。", detail: "土星的光環由無數冰塊和岩石碎片組成，寬廣而纖薄。", ring: true },
  { name: "天王星", color: "#79c8d2", highlight: "#b8f1ee", shade: "#397b91", size: 15, orbit: 0.855, period: 3068, angle: 165, fact: "自轉軸幾乎側躺在軌道平面上。", detail: "天王星是一顆冰巨行星，呈現淡藍綠色，並有微弱的暗淡光環。" },
  { name: "海王星", color: "#527bdf", highlight: "#9bbaff", shade: "#273b8d", size: 15, orbit: 1, period: 6019, angle: 345, fact: "太陽系中距離太陽最遠的行星。", detail: "海王星是深藍色的冰巨行星，擁有太陽系中最快的強風。" }
];

const view = document.querySelector("#space-view");
const orbitLayer = document.querySelector("#orbit-layer");
const planetLayer = document.querySelector("#planet-layer");
const playButton = document.querySelector("#play-button");
const playIcon = document.querySelector("#play-icon");
const playLabel = document.querySelector("#play-label");
const speedSlider = document.querySelector("#speed-slider");
const speedValue = document.querySelector("#speed-value");
const selectedInfo = {
  icon: document.querySelector("#info-icon"),
  kicker: document.querySelector("#info-kicker"),
  title: document.querySelector("#info-title"),
  description: document.querySelector("#info-description"),
  fact: document.querySelector("#info-fact")
};

let isPlaying = true;
let speed = Number(speedSlider.value);
let elapsed = 0;
let previousFrame = 0;
let orbitRadius = 0;
const planetElements = [];

// 以固定亂數種子產生背景星星，讓每次開啟的星空排列一致。
let randomSeed = 2026;
function seededRandom() {
  randomSeed = (randomSeed * 16807) % 2147483647;
  return (randomSeed - 1) / 2147483646;
}
const starfield = document.querySelector("#starfield");
for (let i = 0; i < 130; i += 1) {
  const star = document.createElement("span");
  star.className = "star";
  star.style.left = `${seededRandom() * 100}%`;
  star.style.top = `${seededRandom() * 100}%`;
  star.style.setProperty("--opacity", (0.2 + seededRandom() * 0.65).toFixed(2));
  if (i % 9 === 0) {
    star.style.width = "3px";
    star.style.height = "3px";
  }
  starfield.append(star);
}

// 建立八條軌道及可點選的行星按鈕。
planets.forEach((planet, index) => {
  const orbit = document.createElement("div");
  orbit.className = "orbit-ring";
  orbit.setAttribute("aria-hidden", "true");
  orbitLayer.append(orbit);

  const button = document.createElement("button");
  button.className = "planet";
  button.type = "button";
  button.setAttribute("aria-label", `${planet.name}：${planet.detail}`);
  button.style.setProperty("--size", `${planet.size}px`);
  button.style.setProperty("--planet-color", planet.color);
  button.style.setProperty("--highlight", planet.highlight);
  button.style.setProperty("--shade", planet.shade);
  button.dataset.index = String(index);

  if (planet.ring) {
    const ring = document.createElement("span");
    ring.className = "planet-ring";
    ring.setAttribute("aria-hidden", "true");
    button.append(ring);
  }

  const label = document.createElement("span");
  label.className = "planet-name";
  label.textContent = planet.name;
  button.append(label);
  button.addEventListener("click", () => selectPlanet(index));
  planetLayer.append(button);
  planetElements.push({ button, orbit, data: planet });
});

// 根據模擬區域尺寸調整軌道，讓整個太陽系完整顯示在畫面中。
function updateLayout() {
  const bounds = view.getBoundingClientRect();
  orbitRadius = Math.max(105, Math.min(bounds.height * 0.46, bounds.width * 0.45));
  planetElements.forEach(({ orbit, data }) => {
    const diameter = orbitRadius * data.orbit * 2;
    orbit.style.width = `${diameter}px`;
    orbit.style.height = `${diameter}px`;
  });
  drawPlanets();
}

// 依照每顆行星自己的週期和目前流速計算位置。
function drawPlanets() {
  const bounds = view.getBoundingClientRect();
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;
  planetElements.forEach(({ button, data }) => {
    const angle = (data.angle + (elapsed / data.period) * 360) * Math.PI / 180;
    const radius = orbitRadius * data.orbit;
    button.style.left = `${centerX + Math.cos(angle) * radius}px`;
    button.style.top = `${centerY + Math.sin(angle) * radius}px`;
  });
}

// 更新下方行星介紹，並標示目前選取的行星。
function selectPlanet(index) {
  const planet = planets[index];
  planetElements.forEach(({ button }, buttonIndex) => {
    const selected = buttonIndex === index;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  selectedInfo.icon.textContent = "✦";
  selectedInfo.icon.style.color = planet.highlight;
  selectedInfo.icon.style.borderColor = `${planet.color}66`;
  selectedInfo.kicker.textContent = `PLANET ${String(index + 1).padStart(2, "0")} · SOLAR SYSTEM`;
  selectedInfo.title.textContent = planet.name;
  selectedInfo.description.textContent = planet.detail;
  selectedInfo.fact.innerHTML = `<span>行星小知識</span><strong>${planet.fact}</strong>`;
}

// 切換播放狀態，同步更新按鈕圖示和輔助文字。
playButton.addEventListener("click", () => {
  isPlaying = !isPlaying;
  playButton.setAttribute("aria-label", isPlaying ? "暫停公轉" : "繼續公轉");
  playLabel.textContent = isPlaying ? "公轉進行中" : "公轉已暫停";
  playIcon.innerHTML = isPlaying
    ? '<rect x="5" y="3" width="3.5" height="14" rx="1"></rect><rect x="11.5" y="3" width="3.5" height="14" rx="1"></rect>'
    : '<path d="M6 3.8c0-.7.8-1.1 1.4-.7l9 5.9a1.2 1.2 0 0 1 0 2l-9 5.9c-.6.4-1.4 0-1.4-.7z"></path>';
});

// 重設按鈕會將所有行星帶回程式中設定的起始位置。
document.querySelector("#reset-button").addEventListener("click", () => {
  elapsed = 0;
  drawPlanets();
});

// 調整時間流速，數值會即時顯示在滑桿旁。
speedSlider.addEventListener("input", () => {
  speed = Number(speedSlider.value);
  speedValue.textContent = `${speed.toFixed(1)}×`;
});

// 使用瀏覽器動畫影格更新軌道，避免固定計時器造成畫面不順。
function animate(timestamp) {
  if (previousFrame === 0) previousFrame = timestamp;
  const deltaSeconds = Math.min((timestamp - previousFrame) / 1000, 0.05);
  previousFrame = timestamp;
  if (isPlaying) {
    elapsed += deltaSeconds * speed * 35;
    drawPlanets();
  }
  requestAnimationFrame(animate);
}

window.addEventListener("resize", updateLayout);
updateLayout();
requestAnimationFrame(animate);

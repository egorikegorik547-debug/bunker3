export const MARKUP = /* html */ `
<div id="game"></div>
<div id="vig" class="off"></div>
<div id="danger"></div>
<div id="dmg"></div>

<!-- ============ HUD ============ -->
<div id="hud" class="off">
  <div class="absolute top-3 left-3 max-w-sm">
    <div id="objective" class="text-sm font-semibold text-amber-200"></div>
    <div id="zoneInfo" class="text-sm font-semibold text-cyan-200 mt-1"></div>
    <div id="sortieInfo" class="text-xs text-white/60 mt-1"></div>
  </div>
  <canvas id="mini" width="170" height="170" class="absolute top-3 right-3 rounded border border-white/25"></canvas>
  <div id="cross"></div>
  <div id="prompt" class="absolute left-1/2 text-center off" style="top:57%;transform:translateX(-50%)">
    <div id="promptText" class="text-sm font-semibold mb-1"></div>
    <div class="bar" style="width:170px;margin:auto"><i id="promptBar" style="background:#e8c04a;width:0%"></i></div>
  </div>
  <div id="toasts" class="absolute left-1/2 flex flex-col items-center gap-1" style="bottom:7.5rem;transform:translateX(-50%)"></div>
  <div id="noteBox" class="absolute left-1/2 off panel p-4 text-sm" style="bottom:12rem;transform:translateX(-50%);max-width:30rem;width:92%">
    <div id="noteTitle" class="font-bold text-amber-200 mb-1"></div><div id="noteText" class="text-white/85 leading-relaxed"></div>
  </div>
  <div class="absolute bottom-3 left-3" style="width:15rem">
    <div class="flex items-center gap-2 text-xs mb-1"><span style="width:1.5rem">❤</span><div class="bar flex-1"><i id="hpBar" style="background:#d9473b"></i></div><span id="hpTxt" class="w-8 text-right"></span></div>
    <div class="flex items-center gap-2 text-xs mb-1"><span style="width:1.5rem">⚡</span><div class="bar flex-1"><i id="stBar" style="background:#e0b83d"></i></div></div>
    <div class="flex items-center gap-2 text-xs"><span style="width:1.5rem">🔦</span><div class="bar flex-1"><i id="btBar" style="background:#5fb5ff"></i></div></div>
  </div>
  <div class="absolute bottom-3 left-1/2 text-center" style="transform:translateX(-50%);width:9rem">
    <div class="text-[10px] tracking-widest text-white/60 mb-1">ШУМ</div>
    <div class="bar"><i id="noiseBar" style="background:#8fe3a0;width:5%"></i></div>
  </div>
  <div class="absolute bottom-3 right-3 text-right">
    <div class="text-3xl font-black"><span id="magTxt">8</span><span class="text-lg text-white/60"> / <span id="ammoTxt">0</span></span></div>
    <div id="invTxt" class="text-sm text-white/80 mt-1"></div>
    <div class="text-[10px] text-white/45 mt-1"><kbd>Tab</kbd> инвентарь · <kbd>H</kbd> лечение · <kbd>F</kbd> фонарь · <kbd>R</kbd> перезарядка</div>
  </div>
</div>

<!-- ============ ГЛАВНОЕ МЕНЮ ============ -->
<div id="scr-menu" class="screen">
  <div class="panel p-8 text-center" style="max-width:30rem;width:100%">
    <div class="text-5xl mb-2">☣</div>
    <h1 class="title text-5xl mb-1">БЫВШИЕ</h1>
    <p class="text-white/60 mb-6 text-sm">Вылазки в сеть бункеров. Они были людьми.</p>
    <div class="space-y-3">
      <button id="btnContinue" class="btn main">▶ Продолжить</button>
      <button id="btnNew" class="btn">Новая игра</button>
      <button id="btnHelp" class="btn">❓ Как играть</button>
    </div>
    <div id="helpBox" class="off text-left text-sm text-white/80 mt-5 space-y-1.5">
      <p><kbd>WASD</kbd> — ходьба · <kbd>Shift</kbd> — бег · <kbd>C</kbd> (держать) — красться</p>
      <p><kbd>Мышь</kbd> — обзор · <kbd>ЛКМ</kbd> — выстрел · <kbd>ПКМ</kbd> / <kbd>V</kbd> — удар трубой</p>
      <p><kbd>E</kbd> (держать) — обыск ящиков и тел, шлюз · <kbd>E</kbd> — открыть уже обысканный контейнер</p>
      <p><kbd>Tab</kbd> / <kbd>I</kbd> — инвентарь (игра на паузе) · <kbd>H</kbd> — лечение · <kbd>F</kbd> — фонарь · <kbd>R</kbd> — перезарядка</p>
      <p><kbd>Esc</kbd> — пауза · стрелки — поворот камеры</p>
      <p class="text-amber-200/90 pt-2">Бывшие реагируют на <b>шум</b> и <b>свет</b>. У каждого контейнера — своё содержимое и ограниченное число ячеек: берите нужное, кладите лишнее обратно. Рюкзак тоже ограничен. Найдите карту доступа, откройте хранилище и вернитесь к шлюзу. Погибнете — потеряете всё, что несли.</p>
      <p class="text-white/60">Сеть разбита на зоны: жилой блок, медпункт, столовая, склад, серверная, генераторная, оружейная. В каждой — своя обстановка и своя добыча.</p>
    </div>
  </div>
</div>

<!-- ============ УБЕЖИЩЕ (3D-комната) ============ -->
<div id="hubhud" class="off" style="position:fixed;inset:0;z-index:10;pointer-events:none;text-shadow:0 1px 3px #000">
  <div class="absolute top-3 left-3">
    <div class="title text-xl">УБЕЖИЩЕ №17</div>
    <div class="text-xs text-white/70 mt-1">День <b id="hubDay">1</b> · вылазок: <span id="hSort">0</span> · убито бывших: <span id="hKills">0</span> · потерь: <span id="hDeaths">0</span></div>
  </div>
  <div id="hubChips" class="absolute top-3 right-3 flex flex-wrap gap-1.5 justify-end" style="max-width:28rem"></div>
  <div id="hcross" class="off"></div>
  <div id="hPrompt" class="absolute left-1/2 off" style="top:60%;transform:translateX(-50%)">
    <div class="hprompt"><kbd>E</kbd><span id="hPromptText"></span></div>
  </div>
  <div class="absolute bottom-3 left-1/2 text-[11px] text-white/55" style="transform:translateX(-50%);white-space:nowrap">
    <kbd>W A S D</kbd> ходьба · <kbd>Shift</kbd> быстрее · <kbd>E</kbd> использовать · <kbd>Esc</kbd> пауза
  </div>
</div>
<div id="hfade"></div>

<div id="scr-hubpause" class="screen off hubpause">
  <div class="panel p-6 text-center" style="max-width:36rem;width:100%">
    <h2 class="title text-3xl mb-1">УБЕЖИЩЕ №17</h2>
    <p class="text-white/55 text-sm mb-3">День <b id="hpDay">1</b></p>
    <p id="hubText" class="text-white/80 text-sm leading-relaxed mb-5"></p>
    <div class="space-y-2">
      <button id="hubEnter" class="btn main">🏠 Осмотреться в комнате</button>
      <button id="hubMenu" class="btn">☰ В главное меню</button>
    </div>
    <p class="text-[11px] text-white/40 mt-3">Верстак — крафт и улучшения · Стол — записи · Стеллаж — запасы · Кровать — отдых · Шлюз — вылазка</p>
  </div>
</div>

<div id="scr-station" class="screen dim off">
  <div class="panel p-5 w-full" style="max-width:58rem">
    <div class="flex items-center justify-between gap-3 mb-3">
      <h2 id="stTitle" class="font-bold text-xl text-emerald-300"></h2>
      <button id="stClose" class="btn sm">✕ Закрыть (Esc)</button>
    </div>
    <div id="stBody"></div>
  </div>
</div>

<!-- ============ ПАУЗА / СТАРТ ВЫЛАЗКИ ============ -->
<div id="scr-lock" class="screen dim off">
  <div class="panel p-7 text-center" style="max-width:28rem;width:100%">
    <h2 id="lockTitle" class="title text-3xl mb-2"></h2>
    <p id="lockText" class="text-white/75 text-sm mb-5 leading-relaxed"></p>
    <div class="space-y-3">
      <button id="btnLockGo" class="btn main">Продолжить</button>
      <button id="btnLockQuit" class="btn danger">Бросить вылазку (потерять добычу)</button>
    </div>
    <p id="lockHint" class="text-amber-300 text-xs mt-3"></p>
  </div>
</div>

<!-- ============ ИНВЕНТАРЬ ============ -->
<div id="scr-inv" class="screen dim off">
  <div class="panel p-4 w-full" style="max-width:56rem">
    <div class="flex items-center justify-between mb-3">
      <h2 id="invTitle" class="font-bold text-xl text-emerald-300">🎒 Инвентарь</h2>
      <button class="btn sm" data-act="close">✕ Закрыть <kbd>Tab</kbd></button>
    </div>
    <div class="grid md:grid-cols-2 gap-4">
      <div>
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-sm text-white/80">🎒 Рюкзак</h3><span id="bagCnt" class="text-xs text-white/60"></span>
        </div>
        <div id="invBag" class="slots"></div>
      </div>
      <div>
        <div class="flex justify-between items-center mb-2">
          <h3 id="rightTitle" class="font-bold text-sm text-white/80"></h3>
          <button id="btnTakeAll" class="btn sm off" data-act="takeall">⇦ Взять всё</button>
        </div>
        <div id="invRight"></div>
      </div>
    </div>
    <div id="invDetail" class="detail mt-4 text-sm"></div>
  </div>
</div>

<!-- ============ РЕЗУЛЬТАТ ============ -->
<div id="scr-result" class="screen off">
  <div class="panel p-8 text-center" style="max-width:30rem;width:100%">
    <div id="resEmoji" class="text-5xl mb-2"></div>
    <h2 id="resTitle" class="title text-3xl mb-2"></h2>
    <div id="resBody" class="text-sm text-white/80 text-left leading-relaxed mb-5"></div>
    <button id="btnResult" class="btn main">В убежище</button>
  </div>
</div>
`;

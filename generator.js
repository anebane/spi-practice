// ============================================================
// 問題生成エンジン
// ============================================================

var QuestionGenerator = (function() {

  // --- ランダム整数 ---
  function randomInt(min, max, step) {
    step = step || 1;
    var steps = Math.floor((max - min) / step);
    return min + Math.floor(Math.random() * (steps + 1)) * step;
  }

  // --- 変数生成 ---
  function generateVariables(variablesDef) {
    var values = {};
    for (var key in variablesDef) {
      if (!variablesDef.hasOwnProperty(key)) continue;
      var def = variablesDef[key];
      switch (def.type) {
        case "int":
          values[key] = randomInt(def.min, def.max, def.step);
          break;
        case "float":
          values[key] = def.min + Math.random() * (def.max - def.min);
          values[key] = Math.round(values[key] * 100) / 100;
          break;
        case "choice":
          values[key] = def.options[Math.floor(Math.random() * def.options.length)];
          break;
        case "custom":
          // customは後処理で設定
          break;
      }
    }
    return values;
  }

  // --- テンプレート文字列の展開 ---
  function renderTemplate(template, vars) {
    return template.replace(/\{\{(\w+)\}\}/g, function(match, key) {
      return vars[key] !== undefined ? vars[key] : match;
    });
  }

  // --- custom変数の後処理 ---
  function resolveCustomVariables(template, vars) {
    // テンプレートが自前の resolve を持つ場合はそれに任せる。
    // 新しい問題を足すたびに generator.js を編集しなくて済むので、
    // 1ファイル（src/questions/*.js）で完結して追加できる。
    if (typeof template.resolve === "function") {
      template.resolve(vars);
      return;
    }

    // コイン問題: kはnに依存
    if (template.id === "kakuritsu_coin_01") {
      var kOptions;
      if (vars.n === 3) kOptions = [1, 2];
      else if (vars.n === 4) kOptions = [1, 2, 3];
      else kOptions = [1, 2, 3, 4];
      vars.k = kOptions[Math.floor(Math.random() * kOptions.length)];
    }

    // 損益算: 原価逆算問題 listPriceはmarkupRateに合わせて設定
    if (template.id === "soneki_loss_01") {
      var baseCost = randomInt(500, 3000, 100);
      vars.listPrice = Math.round(baseCost * (1 + vars.markupRate / 100));
    }

    // 損益算: 複数商品問題
    if (template.id === "soneki_multiple_01") {
      vars.sold1 = Math.floor(vars.quantity * (0.4 + Math.random() * 0.3));
      // sold1はquantityより小さい整数
      if (vars.sold1 >= vars.quantity) vars.sold1 = vars.quantity - 1;
      if (vars.sold1 < 1) vars.sold1 = 1;
    }

    // 仕事算: 途中交代問題
    if (template.id === "shigoto_switch_01") {
      // Aが何日か働いた後の残りをBが整数日で終えられるようにする
      for (var attempt = 0; attempt < 50; attempt++) {
        var dAlone = randomInt(1, vars.daysA - 1, 1);
        var remaining = 1 - dAlone / vars.daysA;
        var bDays = remaining * vars.daysB;
        if (remaining > 0 && Math.abs(bDays - Math.round(bDays)) < 0.01) {
          vars.daysAlone = dAlone;
          return;
        }
      }
      // フォールバック
      vars.daysAlone = Math.floor(vars.daysA / 2);
    }

    // 割合: 値上がり問題
    if (template.id === "wariai_change_01") {
      var changeRate = [5, 10, 15, 20, 25, 30][Math.floor(Math.random() * 6)];
      vars.changed = Math.round(vars.original * (1 + changeRate / 100));
    }

    // 割合: 比の問題
    if (template.id === "wariai_ratio_01") {
      var sum = vars.ratioA + vars.ratioB;
      var multiplier = randomInt(10, 100, 10);
      vars.total = sum * multiplier;
    }

    // 損益算: 売価から原価逆算
    if (template.id === "soneki_reverse_01") {
      var baseCost2 = randomInt(500, 3000, 100);
      vars.salePrice = Math.round(baseCost2 * (1 + vars.profitRate / 100));
    }

    // 濃度算: 目標濃度
    if (template.id === "noudo_target_01") {
      // concA < concTarget < concB になるように設定
      vars.concTarget = vars.concA + Math.floor((vars.concB - vars.concA) * (0.3 + Math.random() * 0.4));
      if (vars.concTarget <= vars.concA) vars.concTarget = vars.concA + 1;
      if (vars.concTarget >= vars.concB) vars.concTarget = vars.concB - 1;
    }

    // 仕事算: 途中合流
    if (template.id === "shigoto_join_01") {
      // Aが数日単独で → 残りを2人で仕上げる → Bの日数が整数
      for (var ja = 0; ja < 50; ja++) {
        var alone = randomInt(2, vars.daysA - 2, 1);
        var rem = 1 - alone / vars.daysA;
        // 2人でtog日: tog*(1/daysA + 1/daysB) = rem
        // daysB = 5,6,8,10,12,15,20 から試す
        var bOptions = [5, 6, 8, 10, 12, 15, 20];
        for (var bi = 0; bi < bOptions.length; bi++) {
          var daysB = bOptions[bi];
          var togRate = 1/vars.daysA + 1/daysB;
          var tog = rem / togRate;
          if (tog > 0 && Number.isInteger(Math.round(tog)) && Math.abs(tog - Math.round(tog)) < 0.01) {
            vars.daysAlone = alone;
            vars.daysTogether = Math.round(tog);
            return;
          }
        }
      }
      vars.daysAlone = 3;
      vars.daysTogether = 2;
    }

    // 割合: 3つの比
    if (template.id === "wariai_ratio3_01") {
      var a3 = vars.ab1 * vars.bc1;
      var b3 = vars.ab2 * vars.bc1;
      var c3 = vars.ab2 * vars.bc2;
      var sum3 = a3 + b3 + c3;
      var mult3 = randomInt(100, 1000, 100);
      // 割り切れるようにする
      while (mult3 % sum3 !== 0 && mult3 < 10000) mult3 += 100;
      if (mult3 % sum3 !== 0) mult3 = sum3 * randomInt(10, 100, 10);
      vars.total = mult3;
    }
  }

  // --- パターン型問題の生成 ---
  function generatePatternQuestion(template) {
    var patterns = template.patterns.filter(function(p) { return !p._skip; });
    if (patterns.length === 0) return null;
    var pattern = patterns[Math.floor(Math.random() * patterns.length)];

    return {
      id: template.id + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      templateId: template.id,   // 集計用。id は毎問ユニークなので分析に使えない
      category: template.category,
      categoryId: template.categoryId,
      difficulty: template.difficulty,
      text: pattern.text,
      answerType: template.answerType,
      correctAnswer: pattern.correctIndex,
      choices: pattern.choices,
      unit: "",
      explanation: pattern.explanation,
      timeLimitSec: template.timeLimitSec
    };
  }

  // --- 表問題の生成 ---
  function generateTableQuestion(template) {
    var tableData = template.tableGenerator();
    var qData = template.questionGenerator(tableData);

    var result = {
      id: template.id + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      templateId: template.id,   // 集計用。id は毎問ユニークなので分析に使えない
      category: template.category,
      categoryId: template.categoryId,
      difficulty: template.difficulty || 2,
      text: qData.text,
      answerType: template.answerType,
      correctAnswer: qData.answer,
      unit: qData.unit || "",
      explanation: qData.explanation,
      timeLimitSec: template.timeLimitSec
    };

    if (qData.choices) {
      result.choices = qData.choices;
      // correctAnswerをインデックスに変換
      var idx = qData.choices.indexOf(qData.answer);
      result.correctAnswer = idx >= 0 ? idx : 0;
    }

    return result;
  }

  // --- チャート問題の生成 ---
  function generateChartQuestion(template) {
    var chartData = template.chartGenerator();
    var qData = template.questionGenerator(chartData);

    var result = {
      id: template.id + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      templateId: template.id,   // 集計用。id は毎問ユニークなので分析に使えない
      category: template.category,
      categoryId: template.categoryId,
      difficulty: template.difficulty || 2,
      text: qData.text,
      answerType: template.answerType,
      correctAnswer: qData.answer,
      unit: qData.unit || "",
      explanation: qData.explanation,
      chartConfig: qData.chartConfig,
      timeLimitSec: template.timeLimitSec
    };

    if (qData.choices) {
      result.choices = qData.choices;
      var idx = qData.choices.indexOf(qData.answer);
      result.correctAnswer = idx >= 0 ? idx : 0;
    }

    return result;
  }

  // --- テンプレート型問題の生成 ---
  function generateTemplateQuestion(template) {
    // validate が厳しいテンプレートがある。実測で最も低いのは shigoto_tank_01 の
    // 合格率8.3%（A×B/(A+B) が整数になる組み合わせのみ許可）。
    // 100回だと約0.017%の確率で全滅して null を返し、出題数が足りなくなっていた。
    // 1000回なら全滅確率は 1e-38 程度。ループ本体は軽い算術なので負荷は無視できる。
    var maxAttempts = 1000;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      var vars = generateVariables(template.variables);
      resolveCustomVariables(template, vars);

      // バリデーション
      if (template.validate && !template.validate(vars)) {
        continue;
      }

      var answer = template.answerFormula(vars);

      // 単位は問題ごとに変わることがある（例: 単位変換は答えが m/秒 だったり
      // km/時 だったりする）。関数で返せるようにしておく。
      var unitStr = typeof template.unit === "function"
        ? template.unit(vars)
        : (template.unit || "");

      // 答えの妥当性チェック
      if (template.answerType === "number") {
        if (!isFinite(answer) || isNaN(answer)) continue;
        // 答えが合理的な範囲かチェック
        var rounded = Math.round(answer * 10) / 10;
        if (Math.abs(answer - rounded) > 0.001 && unitStr !== "%") {
          // 小数点以下が長すぎる → 不適切
          // ただし%は小数1桁OK
          continue;
        }
        answer = rounded;
      } else if (template.answerType === "fraction") {
        if (!answer || !answer.numerator || !answer.denominator) continue;
        if (answer.denominator > 200 || answer.denominator <= 0) continue;
      }

      // 問題文の展開
      var text = renderTemplate(template.templateText, vars);

      // 解説の展開（派生変数も計算）
      // テンプレートが derive を持っていればそれを使う。
      // ⚠️ 以前は派生変数の計算が全部 computeDerivedVars の中にあり、
      //    template.id === "..." の分岐が55個・495行に膨らんでいた。
      //    89本中52本がこの関数を触らないと動かず、出題範囲を足すたびに
      //    ここが伸び続ける構造だった（2026-09-06に計測して判明）。
      //    テンプレ側に derive(vars, answer) を置けば計算がそのファイルで完結し、
      //    新しい展開先を足すときにエンジンを触らずに済む。
      //    derive が無いテンプレは従来どおり computeDerivedVars を通る（移行は1分野ずつ）。
      var derivedVars = commonDerived(answer);
      var extraVars = (typeof template.derive === "function")
        ? template.derive(vars, answer)
        : computeDerivedVars(template, vars, answer);
      for (var dk in extraVars) derivedVars[dk] = extraVars[dk];
      applyProbStep(template, vars, derivedVars);
      var allVars = {};
      for (var k in vars) allVars[k] = vars[k];
      for (var k2 in derivedVars) allVars[k2] = derivedVars[k2];
      var explanation = renderTemplate(template.explanationTemplate, allVars);

      var result = {
        id: template.id + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      templateId: template.id,   // 集計用。id は毎問ユニークなので分析に使えない
        category: template.category,
        categoryId: template.categoryId,
        difficulty: template.difficulty,
        text: text,
        answerType: template.answerType,
        correctAnswer: answer,
        choices: null,
        unit: unitStr,
        explanation: explanation,
        timeLimitSec: template.timeLimitSec
      };

      // 選択肢を自前で作るテンプレート（人名など、数値の大小で誤答を作れない場合）。
      // { choices: [...], correctIndex: n } を返す。
      if (typeof template.buildChoices === "function") {
        var bc = template.buildChoices(vars, answer);
        if (!bc || !Array.isArray(bc.choices) || bc.choices.length < 2) continue;
        if (!(bc.correctIndex >= 0 && bc.correctIndex < bc.choices.length)) continue;
        result.choices = bc.choices.map(String);
        result.correctAnswer = bc.correctIndex;
        return result;
      }

      // 選択式テンプレート: distractors(vars, answer) が誤答候補を返す。
      // 誤答は「よくある計算間違いの結果」にすることで、当てずっぽうで
      // 正解できないようにする（近い値をランダムに散らすだけでは意味がない）。
      if (template.distractors) {
        var wrongs = template.distractors(vars, answer) || [];
        var pool = [answer];
        for (var wi = 0; wi < wrongs.length; wi++) {
          var w = wrongs[wi];
          if (!isFinite(w) || w === answer) continue;
          if (Math.abs(w - Math.round(w)) > 0.001) w = Math.round(w * 100) / 100;
          if (w < 0) continue;
          if (pool.indexOf(w) === -1) pool.push(w);
        }
        if (pool.length < 4) continue;              // 選択肢が足りない組み合わせは捨てる

        // 正解の「大きさの順位」が偏らないようにする。
        // 誤答が全部小さいと正解が常に最大になり、逆に大小を必ず混ぜると
        // 正解が常に真ん中になる。どちらも位置から推測できてしまうので、
        // 小さい誤答・大きい誤答を何個ずつ採用するかを毎回ランダムに決める。
        var smaller = [], larger = [];
        for (var pi = 1; pi < pool.length; pi++) {
          (pool[pi] < answer ? smaller : larger).push(pool[pi]);
        }
        var shuf = function(arr) {
          for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
          }
          return arr;
        };
        shuf(smaller); shuf(larger);

        // 片側の在庫が3個に満たないと、その側から必ず選ばざるを得なくなり
        // 正解の順位が偏る。足りない側を答えから機械的に作って補う。
        // 倍・半分といった値は「桁を間違えた」誤答として不自然ではない。
        var pad = function(arr, mk) {
          for (var f = 2; arr.length < 3 && f <= 5; f++) {
            var v = mk(f);
            if (!isFinite(v) || v <= 0) continue;
            v = Math.abs(v - Math.round(v)) > 0.001 ? Math.round(v * 100) / 100 : Math.round(v);
            if (v !== answer && pool.indexOf(v) === -1 && arr.indexOf(v) === -1) arr.push(v);
          }
        };
        pad(smaller, function(f) { return answer / f; });
        pad(larger,  function(f) { return answer * f; });
        // 在庫で実現できる範囲を先に求め、その中から一様に選ぶ。
        // 「0〜3で選んでから在庫に合わせて丸める」と、丸めた先の値に偏る。
        var lo = Math.max(0, 3 - smaller.length);
        var hi = Math.min(3, larger.length);
        if (lo > hi) continue;
        var wantLarger = lo + Math.floor(Math.random() * (hi - lo + 1));
        var picked = larger.slice(0, wantLarger).concat(smaller.slice(0, 3 - wantLarger));
        if (picked.length < 3) continue;
        pool = [answer].concat(picked);
        for (var si = pool.length - 1; si > 0; si--) {
          var sj = Math.floor(Math.random() * (si + 1));
          var st = pool[si]; pool[si] = pool[sj]; pool[sj] = st;
        }
        result.choices = pool.map(function(v) { return String(v); });
        result.correctAnswer = pool.indexOf(answer);
      }

      return result;
    }

    // フォールバック: 最後に生成された変数で強制返す
    return null;
  }

  // --- 派生変数の計算 ---

  // どのテンプレートでも使える共通の派生変数。
  // ⚠️ ここはエンジンが必ず供給する「契約」。テンプレ側の derive はこれを
  //    上書きするのではなく、自分の分だけを足す。
  //    （2026-09-06: derive を入れた際、テンプレの戻り値で丸ごと置き換えて
  //     しまい、解説の {{answer}} が全問未展開になった。分岐を移すときは
  //     共通部分がどこにあるかを先に確かめること）
  function commonDerived(answer) {
    var d = {};
    if (answer !== null && answer !== undefined) {
      if (typeof answer === "object" && answer.numerator !== undefined) {
        d.ansNum = answer.numerator;
        d.ansDen = answer.denominator;
        d.answer = answer.numerator + "/" + answer.denominator;
      } else {
        d.answer = answer;
      }
    }
    return d;
  }

  // 確率の途中式「n / d = 約分後」を作る。
  // ⚠️ テンプレートが probPair: ["分子キー", "分母キー"] を宣言していれば効く。
  //    数値を直接書いてもよい（例: ["count", 36]）。
  //    以前は generator.js に PROB_PAIRS というテンプレIDの表を持っていたが、
  //    出題範囲を足すたびに表が伸びる形だったのでテンプレ側の宣言に移した。
  //    派生変数(d)が出そろった後に呼ぶ必要がある（dの値を参照するため）。
  function applyProbStep(template, vars, d) {
    var pr = template.probPair;
    if (!pr) return;
    function pick(k) {
      if (typeof k === "number") return k;
      return d[k] !== undefined ? d[k] : vars[k];
    }
    var pn = pick(pr[0]), pd = pick(pr[1]);
    if (typeof pn === "number" && typeof pd === "number") d.probStep = stepStr(pn, pd);
  }

  function computeDerivedVars(template, vars, answer) {
    // 推論(順序): 解説で使う並びと答え
    if (/^suiron_order_/.test(template.id)) {
      return {
        orderText: vars._order.join(" → "),
        answerName: vars._answerName
      };
    }

    // 推論(嘘つき): 解説で使う答え

    // 推論(対応関係): 解説で使う確定表
    if (/^suiron_match_/.test(template.id)) {
      return { assignText: vars._assign, answerItem: vars._answerItem };
    }

    // 推論(直線距離): 解説で使う平方

    var d = {};

    // fracStr / stepStr は src/questions/_base.js の共有版を使う。
    // テンプレ側の derive() からも同じ関数を呼べるようにするため移した。

    // 「元の分数 = 約分後」の1行。約分できないときは同じ式が2度並んでしまい
    // （5 / 32 = 5 / 32）、そこで計算が1歩も進まない。
    // 約分できるときだけ2段で書く。

    // 集合: 「A+B = A+B ですが全体は…」と書いていて、和が計算されていなかった。

    // 確率の解説にある「元の分数 = 約分後」の行。
    // 約分できないと同じ式が2度並び（5 / 32 = 5 / 32）、計算が1歩も進まない。
    // テンプレートごとに「約分前の分子・分母」がどの変数かだけを持ち、
    // 2段で書くか1段で書くかは stepStr に任せる。
    // 共通
    if (answer !== null && answer !== undefined) {
      if (typeof answer === "object" && answer.numerator !== undefined) {
        d.ansNum = answer.numerator;
        d.ansDen = answer.denominator;
        d.answer = answer.numerator + "/" + answer.denominator;
      } else {
        d.answer = answer;
      }
    }

    // 確率: 玉問題

    // 確率: サイコロ・カードの派生変数はテンプレート側の resolve が作る。
    // 問われ方（合計/差、奇数/偶数/3の倍数）を可変にしたので、
    // 「合計」「奇数」を前提にした式がここに残っていると解説だけ誤る。

    // 確率: コイン

    // 確率: くじ

    // 集合

    // 損益算

    // 速度算
    // 速度算。割り切れない時間は小数に丸めず分数で書く。
    // 「70 / 12 = 5.83」「5.83 × 60 = 350」は、利用者が電卓で追うと合わない
    // （真値は 5.8333… と 349.8）。分数なら最後まで正確に追える。

    // 仕事算
    // 途中交代。ここも分数のまま通す。
    // aDone/remaining に式の文字列を入れていたため、解説が
    // 「5/10 = 5/10」「1 - 5/10 = 1 - 5/10」という同語反復になっていた。
    // 3人。combined に式の文字列を入れていたため
    // 「1/9 + 1/12 + 1/18 = 1/9 + 1/12 + 1/18」という同語反復になっていた。
    // 合計は通分した1つの分数で書く。

    // 濃度算

    // 割合

    // 順列・組み合わせ
    // C(n, r) を「実際の計算」に展開する。
    // ここが "C(n, r)" のままだと解説が「C(10, 5) = C(10, 5) = 252」となり、
    // 組み合わせの計算方法が1文字も示されない。
    // junretsu_cond_01 の派生変数はテンプレート側の resolve が作る。
    // 隣り合う人数 k を可変にしたので、2人固定を前提にした (n-1)! では合わない。

    // --- 追加テンプレート用の派生変数 ---

    // 確率: 3色玉

    // 確率: 条件付き

    // 損益算: 2商品比較

    // 集合: 割合

    // 損益算: 売価逆算

    // 損益算: 利益率

    // 速度算: 電車すれ違い

    // 速度算: 遅刻早着

    // 仕事算: 途中合流。すべて分数で書く（小数に落とさない）。
    //   1/B = 残り÷共同日数 - 1/A
    //       = (A-alone)/(A×tog) - 1/A
    //       = (A - alone - tog) / (A×tog)

    // 濃度算: 水追加

    // 濃度算: 食塩追加

    // 濃度算: 取り出し

    // 割合: 連続増減の after1 はテンプレート側の resolve が作る。
    // 増減の向きを可変にしたので、常に増加とみなす式をここに残すと
    // 「減少」の問題で解説の途中経過だけが誤る。

    // 割合: 3つの比

    // 割合: 人口

    // 順列: 円順列

    // 組合せ: 委員

    // 組合せ: 最短経路

    // 順列: 先頭除外

    // kakuritsu_arrange_01 の派生変数もテンプレート側の resolve が作る
    // （隣り合う個数 k を可変にしたため）。

    // 派生変数がすべて出そろってから組み立てる（分岐の順序に依存させない）


    return d;
  }

  // --- 試験セットの生成 ---
  function generateExamSet(config) {
    var totalQuestions = config.totalQuestions || 20;
    var selectedCategories = config.selectedCategories || [];
    var selectedDifficulties = config.selectedDifficulties || [1, 2, 3];

    // 対象テンプレートのフィルタ
    var templates = QUESTION_TEMPLATES.filter(function(t) {
      if (selectedCategories.length > 0 && selectedCategories.indexOf(t.categoryId) === -1) {
        return false;
      }
      if (selectedDifficulties.length > 0 && selectedDifficulties.indexOf(t.difficulty) === -1) {
        return false;
      }
      return true;
    });

    if (templates.length === 0) return [];

    // カテゴリごとに均等配分
    var categoryIds = [];
    templates.forEach(function(t) {
      if (categoryIds.indexOf(t.categoryId) === -1) {
        categoryIds.push(t.categoryId);
      }
    });

    var perCategory = Math.floor(totalQuestions / categoryIds.length);
    var remainder = totalQuestions % categoryIds.length;

    var questions = [];

    categoryIds.forEach(function(catId, idx) {
      var count = perCategory + (idx < remainder ? 1 : 0);
      var catTemplates = templates.filter(function(t) { return t.categoryId === catId; });

      for (var i = 0; i < count; i++) {
        var tmpl = catTemplates[i % catTemplates.length];
        var q = null;

        if (tmpl.type === "pattern") {
          q = generatePatternQuestion(tmpl);
        } else if (tmpl.type === "table") {
          q = generateTableQuestion(tmpl);
        } else if (tmpl.type === "chart") {
          q = generateChartQuestion(tmpl);
        } else {
          q = generateTemplateQuestion(tmpl);
        }

        if (q) {
          questions.push(q);
        } else {
          // 生成失敗 → 別のテンプレートで再試行
          var altTmpl = catTemplates[(i + 1) % catTemplates.length];
          if (altTmpl.type === "pattern") {
            q = generatePatternQuestion(altTmpl);
          } else if (altTmpl.type === "table") {
            q = generateTableQuestion(altTmpl);
          } else if (altTmpl.type === "chart") {
            q = generateChartQuestion(altTmpl);
          } else {
            q = generateTemplateQuestion(altTmpl);
          }
          if (q) questions.push(q);
        }
      }
    });

    // シャッフル
    for (var s = questions.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var temp = questions[s];
      questions[s] = questions[j];
      questions[j] = temp;
    }

    return questions;
  }

  // Public API
  return {
    generateExamSet: generateExamSet,
    generateQuestion: function(template) {
      if (template.type === "pattern") return generatePatternQuestion(template);
      if (template.type === "table") return generateTableQuestion(template);
      if (template.type === "chart") return generateChartQuestion(template);
      return generateTemplateQuestion(template);
    }
  };
})();

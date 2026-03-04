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
    var maxAttempts = 100;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      var vars = generateVariables(template.variables);
      resolveCustomVariables(template, vars);

      // バリデーション
      if (template.validate && !template.validate(vars)) {
        continue;
      }

      var answer = template.answerFormula(vars);

      // 答えの妥当性チェック
      if (template.answerType === "number") {
        if (!isFinite(answer) || isNaN(answer)) continue;
        // 答えが合理的な範囲かチェック
        var rounded = Math.round(answer * 10) / 10;
        if (Math.abs(answer - rounded) > 0.001 && template.unit !== "%") {
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
      var derivedVars = computeDerivedVars(template, vars, answer);
      var allVars = {};
      for (var k in vars) allVars[k] = vars[k];
      for (var k2 in derivedVars) allVars[k2] = derivedVars[k2];
      var explanation = renderTemplate(template.explanationTemplate, allVars);

      return {
        id: template.id + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        category: template.category,
        categoryId: template.categoryId,
        difficulty: template.difficulty,
        text: text,
        answerType: template.answerType,
        correctAnswer: answer,
        choices: null,
        unit: template.unit || "",
        explanation: explanation,
        timeLimitSec: template.timeLimitSec
      };
    }

    // フォールバック: 最後に生成された変数で強制返す
    return null;
  }

  // --- 派生変数の計算 ---
  function computeDerivedVars(template, vars, answer) {
    var d = {};

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
    if (template.id === "kakuritsu_ball_01") {
      var total = vars.red + vars.white;
      d.total = total;
      d.totalM1 = total - 1;
      d.redM1 = vars.red - 1;
      d.den = total * (total - 1) / 2;
      d.num = vars.red * (vars.red - 1) / 2;
    }

    // 確率: サイコロ
    if (template.id === "kakuritsu_dice_01") {
      var combos = [];
      var count = 0;
      for (var i = 1; i <= 6; i++) {
        for (var j = 1; j <= 6; j++) {
          if (i + j === vars.target) {
            combos.push("(" + i + ", " + j + ")");
            count++;
          }
        }
      }
      d.combinations = combos.join(", ");
      d.count = count;
    }

    // 確率: コイン
    if (template.id === "kakuritsu_coin_01") {
      d.den = Math.pow(2, vars.n);
      d.num = combination(vars.n, vars.k);
    }

    // 確率: カード
    if (template.id === "kakuritsu_card_01") {
      d.oddCount = Math.ceil(vars.n / 2);
      d.den = vars.n * (vars.n - 1) / 2;
      d.num = d.oddCount * (d.oddCount - 1) / 2;
    }

    // 確率: くじ
    if (template.id === "kakuritsu_lottery_01") {
      d.lose = vars.total - vars.win;
      d.allPairs = vars.total * (vars.total - 1) / 2;
      d.losePairs = d.lose * (d.lose - 1) / 2;
    }

    // 集合
    if (template.id === "shugo_2set_01") {
      d.union = vars.a + vars.b - vars.ab;
    }
    if (template.id === "shugo_2set_02") {
      d.union = vars.total - vars.neither;
    }
    if (template.id === "shugo_3set_01") {
      d.union = vars.a + vars.b + vars.c - vars.ab - vars.bc - vars.ac + vars.abc;
    }

    // 損益算
    if (template.id === "soneki_basic_01") {
      d.multiplier = 1 + vars.markupRate / 100;
    }
    if (template.id === "soneki_discount_01") {
      d.listPrice = Math.round(vars.cost * (1 + vars.markupRate / 100));
      d.salePrice = Math.round(d.listPrice * (1 - vars.discountRate / 100));
    }
    if (template.id === "soneki_loss_01") {
      d.multiplier = 1 + vars.markupRate / 100;
    }
    if (template.id === "soneki_multiple_01") {
      d.listPrice = Math.round(vars.cost * (1 + vars.markupRate / 100));
      d.discountPrice = Math.round(d.listPrice * (1 - vars.discountRate / 100));
      d.sold2 = vars.quantity - vars.sold1;
      d.revenue = Math.round(d.listPrice * vars.sold1 + d.discountPrice * d.sold2);
      d.totalCost = vars.cost * vars.quantity;
    }

    // 速度算
    if (template.id === "sokudo_basic_01") {
      d.hours = Math.round(vars.distance / vars.speed * 100) / 100;
    }
    if (template.id === "sokudo_encounter_01") {
      d.totalSpeed = vars.speedA + vars.speedB;
      d.hours = Math.round(vars.distance / d.totalSpeed * 100) / 100;
    }
    if (template.id === "sokudo_chase_01") {
      d.gap = vars.speedA * vars.headStart;
      d.diff = vars.speedB - vars.speedA;
    }
    if (template.id === "sokudo_round_01") {
      d.totalDist = vars.distance * 2;
      d.timeGo = Math.round(vars.distance / vars.speedGo * 100) / 100;
      d.timeBack = Math.round(vars.distance / vars.speedBack * 100) / 100;
      d.totalTime = Math.round((d.timeGo + d.timeBack) * 100) / 100;
    }

    // 仕事算
    if (template.id === "shigoto_basic_01") {
      d.combined = "(" + vars.daysA + " + " + vars.daysB + ") / (" + vars.daysA + " × " + vars.daysB + ")";
    }
    if (template.id === "shigoto_switch_01") {
      d.aDone = vars.daysAlone + "/" + vars.daysA;
      d.remaining = "1 - " + d.aDone;
    }
    if (template.id === "shigoto_3people_01") {
      d.combined = "1/" + vars.daysA + " + 1/" + vars.daysB + " + 1/" + vars.daysC;
    }

    // 濃度算
    if (template.id === "noudo_basic_01") {
      d.total = vars.water + vars.salt;
    }
    if (template.id === "noudo_mix_01") {
      d.saltA = vars.weightA * vars.concA / 100;
      d.saltB = vars.weightB * vars.concB / 100;
      d.totalSalt = d.saltA + d.saltB;
      d.totalWeight = vars.weightA + vars.weightB;
    }
    if (template.id === "noudo_evaporate_01") {
      d.salt = vars.weight * vars.conc / 100;
      d.newWeight = vars.weight - vars.evap;
    }

    // 割合
    if (template.id === "wariai_change_01") {
      d.diff = vars.changed - vars.original;
    }
    if (template.id === "wariai_ratio_01") {
      d.ratioSum = vars.ratioA + vars.ratioB;
    }
    if (template.id === "wariai_increase_01") {
      d.multiplier = 1 + vars.percent / 100;
    }

    // 順列・組み合わせ
    if (template.id === "junretsu_basic_01") {
      var calc = [];
      for (var pi = 0; pi < vars.r; pi++) calc.push(vars.n - pi);
      d.calculation = calc.join(" × ");
    }
    if (template.id === "kumiawase_basic_01") {
      d.calculation = "C(" + vars.n + ", " + vars.r + ")";
    }
    if (template.id === "junretsu_cond_01") {
      d.nMinus1 = vars.n - 1;
      d.blockPerm = factorial(vars.n - 1);
    }
    if (template.id === "kumiawase_cond_01") {
      d.boysComb = combination(vars.boys, vars.selectBoys);
      d.girlsComb = combination(vars.girls, vars.selectGirls);
    }

    // --- 追加テンプレート用の派生変数 ---

    // 確率: 3色玉
    if (template.id === "kakuritsu_ball3_01") {
      d.total = vars.red + vars.white + vars.blue;
      d.allPairs = d.total * (d.total - 1) / 2;
      d.samePairs = vars.red*(vars.red-1)/2 + vars.white*(vars.white-1)/2 + vars.blue*(vars.blue-1)/2;
      d.diffPairs = d.allPairs - d.samePairs;
    }

    // 確率: 条件付き
    if (template.id === "kakuritsu_cond_01") {
      d.redM1 = vars.red - 1;
      d.denTotal = vars.red + vars.white - 1;
    }

    // 損益算: 2商品比較
    if (template.id === "soneki_compare_01") {
      d.mA = 1 + vars.markupA / 100;
      d.dA = 1 - vars.discountA / 100;
      d.listA = Math.round(vars.costA * d.mA);
      d.saleA = Math.round(d.listA * d.dA);
      d.profitA = d.saleA - vars.costA;
      d.mB = 1 + vars.markupB / 100;
      d.dB = 1 - vars.discountB / 100;
      d.listB = Math.round(vars.costB * d.mB);
      d.saleB = Math.round(d.listB * d.dB);
      d.profitB = d.saleB - vars.costB;
    }

    // 集合: 割合
    if (template.id === "shugo_percent_01") {
      d.unionPct = vars.pctA + vars.pctB - vars.pctAB;
      d.neitherPct = 100 - d.unionPct;
    }

    // 損益算: 売価逆算
    if (template.id === "soneki_reverse_01") {
      d.multiplier = 1 + vars.profitRate / 100;
    }

    // 損益算: 利益率
    if (template.id === "soneki_profitrate_01") {
      d.listPrice = Math.round(vars.cost * (1 + vars.markupRate / 100));
      d.salePrice = Math.round(d.listPrice * (1 - vars.discountRate / 100));
      d.profit = d.salePrice - vars.cost;
    }

    // 速度算: 電車すれ違い
    if (template.id === "sokudo_train_01") {
      d.totalLen = vars.lenA + vars.lenB;
      d.totalSpeedKmh = vars.speedA + vars.speedB;
      d.totalSpeedMs = Math.round(d.totalSpeedKmh * 1000 / 3600 * 10) / 10;
    }

    // 速度算: 遅刻早着
    if (template.id === "sokudo_late_01") {
      d.timeDiff = vars.late + vars.early;
    }

    // 仕事算: 途中合流
    if (template.id === "shigoto_join_01") {
      d.aDone = vars.daysAlone + "/" + vars.daysA;
      d.remaining = Math.round((1 - vars.daysAlone / vars.daysA) * 100) / 100;
    }

    // 濃度算: 水追加
    if (template.id === "noudo_addwater_01") {
      d.salt = vars.weight * vars.conc / 100;
      d.newWeight = vars.weight + vars.addWater;
    }

    // 濃度算: 食塩追加
    if (template.id === "noudo_addsalt_01") {
      d.origSalt = vars.weight * vars.conc / 100;
      d.totalSalt = d.origSalt + vars.addSalt;
      d.newWeight = vars.weight + vars.addSalt;
    }

    // 濃度算: 取り出し
    if (template.id === "noudo_replace_01") {
      d.origSalt = vars.weight * vars.conc / 100;
      d.removedSalt = vars.remove * vars.conc / 100;
      d.newSalt = d.origSalt - d.removedSalt;
    }

    // 割合: 連続増減
    if (template.id === "wariai_consecutive_01") {
      d.after1 = Math.round((1 + vars.percent1/100) * 100);
    }

    // 割合: 3つの比
    if (template.id === "wariai_ratio3_01") {
      d.a = vars.ab1 * vars.bc1;
      d.b = vars.ab2 * vars.bc1;
      d.c = vars.ab2 * vars.bc2;
    }

    // 割合: 人口
    if (template.id === "wariai_population_01") {
      d.totalRatio = vars.maleRatio + vars.femaleRatio;
      d.male = Math.round(vars.population * vars.maleRatio / d.totalRatio);
      d.female = vars.population - d.male;
      d.newMale = Math.round(d.male * (1 + vars.maleChange/100));
      d.newFemale = Math.round(d.female * (1 - vars.femaleChange/100));
    }

    // 順列: 円順列
    if (template.id === "junretsu_circle_01") {
      d.nMinus1 = vars.n - 1;
    }

    // 組合せ: 委員
    if (template.id === "kumiawase_committee_01") {
      d.nM1 = vars.n - 1;
      d.nM2 = vars.n - 2;
    }

    // 組合せ: 最短経路
    if (template.id === "kumiawase_path_01") {
      d.total = vars.right + vars.up;
    }

    // 順列: 先頭除外
    if (template.id === "junretsu_exclude_01") {
      d.allPerm = factorial(vars.n);
      d.headPerm = factorial(vars.n - 1);
    }

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

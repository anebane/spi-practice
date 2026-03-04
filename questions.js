// ============================================================
// SPI 非言語 問題テンプレート定義
// ============================================================
// 各テンプレートは以下のフィールドを持つ:
//   id, category, categoryId, difficulty(1-3),
//   templateText ({{var}}形式), variables,
//   answerType ("number"|"fraction"|"choice"),
//   answerFormula(vars), unit, explanationTemplate,
//   timeLimitSec
// ============================================================

var QUESTION_TEMPLATES = [];

// ============================================================
// カテゴリ1: 推論（論理・命題）
// ============================================================
(function() {
  // 推論問題はパターンプール方式
  // 順序推論
  QUESTION_TEMPLATES.push({
    id: "suiron_order_01",
    category: "推論",
    categoryId: 1,
    difficulty: 1,
    type: "pattern",
    patterns: [
      {
        text: "A, B, C, D の4人が一列に並んでいる。以下のことがわかっている。\n・AはBより前にいる\n・CはDより前にいる\n・BはCより前にいる\n\n先頭から2番目にいるのは誰か。",
        choices: ["A", "B", "C", "D"],
        correctIndex: 1,
        explanation: "条件を整理すると:\n・A → B → C → D の順番\nよって先頭から2番目はBです。"
      },
      {
        text: "P, Q, R, S の4人が一列に並んでいる。以下のことがわかっている。\n・RはPより前にいる\n・SはQより前にいる\n・PはSより前にいる\n\n最後尾にいるのは誰か。",
        choices: ["P", "Q", "R", "S"],
        correctIndex: 1,
        explanation: "条件を整理すると:\n・R → P → S → Q の順番\nよって最後尾はQです。"
      },
      {
        text: "W, X, Y, Z の4人が一列に並んでいる。以下のことがわかっている。\n・XはWより前にいる\n・ZはYより前にいる\n・WはZより前にいる\n\n先頭にいるのは誰か。",
        choices: ["W", "X", "Y", "Z"],
        correctIndex: 1,
        explanation: "条件を整理すると:\n・X → W → Z → Y の順番\nよって先頭はXです。"
      }
    ],
    answerType: "choice",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "suiron_order_02",
    category: "推論",
    categoryId: 1,
    difficulty: 2,
    type: "pattern",
    patterns: [
      {
        text: "A, B, C, D, E の5人がテストを受けた。以下のことがわかっている。\n・AはBより高い点数だった\n・BはCより高い点数だった\n・CはDより高い点数だった\n・DはEより高い点数だった\n\n3番目に高い点数だったのは誰か。",
        choices: ["A", "B", "C", "D", "E"],
        correctIndex: 2,
        explanation: "条件を整理すると:\nA > B > C > D > E\nよって3番目に高いのはCです。"
      },
      {
        text: "5人の生徒 A, B, C, D, E の身長について以下のことがわかっている。\n・AはCより高い\n・CはDより高い\n・DはBより高い\n・BはEより高い\n\n身長が低い方から2番目は誰か。",
        choices: ["A", "B", "C", "D", "E"],
        correctIndex: 1,
        explanation: "条件を整理すると:\nA > C > D > B > E\n低い方から: E, B, D, C, A\nよって低い方から2番目はBです。"
      },
      {
        text: "P, Q, R, S, T の5人が100m走をした。以下のことがわかっている。\n・PはQより速かった\n・QはRより速かった\n・RはSより速かった\n・SはTより速かった\n\n3位は誰か。",
        choices: ["P", "Q", "R", "S", "T"],
        correctIndex: 2,
        explanation: "条件を整理すると:\nP > Q > R > S > T（速い順）\nよって3位はRです。"
      }
    ],
    answerType: "choice",
    timeLimitSec: 150
  });

  // 推論: 対応問題
  QUESTION_TEMPLATES.push({
    id: "suiron_match_01",
    category: "推論",
    categoryId: 1,
    difficulty: 1,
    type: "pattern",
    patterns: [
      {
        text: "A, B, C の3人がそれぞれ犬、猫、鳥のいずれか1匹ずつペットを飼っている。\n以下のことがわかっている。\n・Aは犬を飼っていない\n・Bは猫を飼っていない\n・Cは犬も猫も飼っていない\n\nBが飼っているペットは何か。",
        choices: ["犬", "猫", "鳥"],
        correctIndex: 0,
        explanation: "条件を整理すると:\n・Cは犬も猫も飼っていない → Cは鳥\n・Aは犬を飼っていない → Aは猫（鳥はCなので）\n・Bは猫を飼っていない → Bは犬（鳥はC、猫はAなので）\n\nよってBは犬を飼っています。"
      },
      {
        text: "P, Q, R の3人がそれぞれ東京、大阪、福岡のいずれかに住んでいる。\n以下のことがわかっている。\n・Pは東京に住んでいない\n・Qは大阪に住んでいない\n・Rは東京にも大阪にも住んでいない\n\nPが住んでいるのはどこか。",
        choices: ["東京", "大阪", "福岡"],
        correctIndex: 1,
        explanation: "条件を整理すると:\n・Rは東京にも大阪にも住んでいない → Rは福岡\n・Pは東京に住んでいない → Pは大阪（福岡はRなので）\n・Qは大阪に住んでいない → Qは東京\n\nよってPは大阪に住んでいます。"
      },
      {
        text: "X, Y, Z の3人がそれぞれ赤、青、黄のいずれか1色のシャツを着ている。\n以下のことがわかっている。\n・Xは青のシャツを着ていない\n・Yは赤のシャツを着ていない\n・Zは青も赤も着ていない\n\nYが着ているシャツの色は何か。",
        choices: ["赤", "青", "黄"],
        correctIndex: 1,
        explanation: "条件を整理すると:\n・Zは青も赤も着ていない → Zは黄\n・Xは青を着ていない → Xは赤（黄はZなので）\n・Yは赤を着ていない → Yは青\n\nよってYは青のシャツを着ています。"
      }
    ],
    answerType: "choice",
    timeLimitSec: 120
  });

  // 推論: 命題
  QUESTION_TEMPLATES.push({
    id: "suiron_prop_01",
    category: "推論",
    categoryId: 1,
    difficulty: 1,
    type: "pattern",
    patterns: [
      {
        text: "「雨が降れば地面が濡れる」が正しいとき、必ず正しいと言えるものはどれか。",
        choices: [
          "地面が濡れていれば雨が降った",
          "雨が降らなければ地面は濡れない",
          "地面が濡れていなければ雨は降っていない",
          "地面が乾いていれば晴れている"
        ],
        correctIndex: 2,
        explanation: "「A → B」の対偶は「¬B → ¬A」です。\n「雨が降る → 地面が濡れる」の対偶は\n「地面が濡れていない → 雨は降っていない」\n\n逆「B → A」や裏「¬A → ¬B」は必ずしも成り立ちません。\nよって答えは「地面が濡れていなければ雨は降っていない」です。"
      },
      {
        text: "「犬を飼っている人は動物が好きだ」が正しいとき、必ず正しいと言えるものはどれか。",
        choices: [
          "動物が好きな人は犬を飼っている",
          "犬を飼っていない人は動物が好きではない",
          "動物が好きではない人は犬を飼っていない",
          "猫を飼っている人も動物が好きだ"
        ],
        correctIndex: 2,
        explanation: "「犬を飼っている → 動物が好き」の対偶は\n「動物が好きではない → 犬を飼っていない」\n\n対偶は元の命題と同値（必ず正しい）です。\nよって答えは「動物が好きではない人は犬を飼っていない」です。"
      },
      {
        text: "「この店の会員であれば割引を受けられる」が正しいとき、必ず正しいと言えるものはどれか。",
        choices: [
          "割引を受けている人はこの店の会員である",
          "会員でなければ割引は受けられない",
          "割引を受けていない人はこの店の会員ではない",
          "会員であれば必ず商品を購入する"
        ],
        correctIndex: 2,
        explanation: "「会員である → 割引を受けられる」の対偶は\n「割引を受けていない → 会員ではない」\n\n対偶は元の命題と同値（必ず正しい）です。\nよって答えは「割引を受けていない人はこの店の会員ではない」です。"
      }
    ],
    answerType: "choice",
    timeLimitSec: 90
  });

  // 推論: 真偽判定
  QUESTION_TEMPLATES.push({
    id: "suiron_tf_01",
    category: "推論",
    categoryId: 1,
    difficulty: 2,
    type: "pattern",
    patterns: [
      {
        text: "ある会社の社員について以下のことがわかっている。\n・営業部の社員は全員、運転免許を持っている\n・田中さんは運転免許を持っている\n\n次のうち、確実に正しいと言えるものはどれか。",
        choices: [
          "田中さんは営業部の社員である",
          "営業部でない社員は運転免許を持っていない",
          "運転免許を持っていない人は営業部の社員ではない",
          "田中さんは営業部でない部署の社員である"
        ],
        correctIndex: 2,
        explanation: "「営業部の社員 → 運転免許を持っている」の対偶は\n「運転免許を持っていない → 営業部の社員ではない」\nこれは確実に正しいです。\n\n田中さんについては、免許を持っていることから営業部かどうかは判断できません\n（営業部以外でも免許を持つことは可能）。"
      },
      {
        text: "あるクラスの生徒について以下のことがわかっている。\n・サッカー部の生徒は全員、体力テストでA判定を取った\n・鈴木さんは体力テストでA判定を取った\n\n次のうち、確実に正しいと言えるものはどれか。",
        choices: [
          "鈴木さんはサッカー部の生徒である",
          "サッカー部でない生徒はA判定を取っていない",
          "A判定を取っていない生徒はサッカー部ではない",
          "A判定を取った生徒は全員サッカー部である"
        ],
        correctIndex: 2,
        explanation: "「サッカー部の生徒 → A判定」の対偶は\n「A判定ではない → サッカー部ではない」\nこれは確実に正しいです。\n\n鈴木さんがA判定を取ったからといって、サッカー部とは限りません。"
      }
    ],
    answerType: "choice",
    timeLimitSec: 120
  });

  // 推論: 条件からの判定（WEBテスティング特有）
  QUESTION_TEMPLATES.push({
    id: "suiron_cond_01",
    category: "推論",
    categoryId: 1,
    difficulty: 3,
    type: "pattern",
    patterns: [
      {
        text: "5つの箱に1から5までの番号が1つずつ書かれたカードが入っている。\n以下のことがわかっている。\n・箱Aに入っているカードの番号は箱Bより大きい\n・箱Cに入っているカードの番号は3である\n・箱Dに入っているカードの番号は箱Eより小さい\n\n箱Aに入っているカードの番号として考えられるものをすべて選ぶと、いくつあるか。",
        choices: ["1つ", "2つ", "3つ", "4つ"],
        correctIndex: 2,
        explanation: "箱Cは3が確定。\n残りは1,2,4,5を A,B,D,E に割り当てる。\nA > B、D < E の条件がある。\n\n可能な割り当て:\n・A=4,B=1,D=2,E=5 → A>B:○, D<E:○\n・A=4,B=2,D=1,E=5 → A>B:○, D<E:○\n・A=5,B=1,D=2,E=4 → A>B:○, D<E:○\n・A=5,B=2,D=1,E=4 → A>B:○, D<E:○\n・A=5,B=4,D=1,E=2 → A>B:○, D<E:○\n・A=5,B=1,D=4,E=... → 残りなし\n・A=2,B=1,D=4,E=5 → A>B:○, D<E:○\n\nAの値: 2, 4, 5 の3つ。\nよって答えは3つです。"
      },
      {
        text: "A, B, C, D の4人が1位から4位まで順位をつけた。\n以下のことがわかっている。\n・AはCより上位だった\n・BはDより下位だった\n\nBの順位として考えられるものは何通りあるか。",
        choices: ["1通り", "2通り", "3通り"],
        correctIndex: 2,
        explanation: "条件: A < C（順位の数値はAの方が小さい=上位）, B > D\n\n全パターンを列挙:\n1位A,2位D,3位B,4位C → A<C:1<4○, B>D:3>2○ → Bは3位\n1位A,2位D,3位C,4位B → A<C:1<3○, B>D:4>2○ → Bは4位\n1位D,2位A,3位B,4位C → A<C:2<4○, B>D:3>1○ → Bは3位\n1位D,2位A,3位C,4位B → A<C:2<3○, B>D:4>1○ → Bは4位\n1位D,2位B,3位A,4位C → A<C:3<4○, B>D:2>1○ → Bは2位\n1位A,2位B,3位D,4位C → B>D:2>3✗\n\nBの順位: 2位, 3位, 4位 の3通り。"
      }
    ],
    answerType: "choice",
    timeLimitSec: 150
  });

  // 推論: 発言の真偽
  QUESTION_TEMPLATES.push({
    id: "suiron_statement_01",
    category: "推論",
    categoryId: 1,
    difficulty: 2,
    type: "pattern",
    patterns: [
      {
        text: "A, B, C の3人のうち、1人だけが嘘をついている。\n・Aの発言:「Bは嘘つきだ」\n・Bの発言:「Cは嘘つきではない」\n・Cの発言:「Aは嘘つきだ」\n\n嘘をついているのは誰か。",
        choices: ["A", "B", "C"],
        correctIndex: 0,
        explanation: "場合分けで考えます:\n\n【Aが嘘つきの場合】\n・A「Bは嘘つき」→ 嘘なのでBは正直 ○\n・B「Cは嘘つきではない」→ 本当なのでCは正直 ○\n・C「Aは嘘つきだ」→ 本当 ○\n→ 嘘つきはAだけで整合!\n\n【Bが嘘つきの場合】\n・A「Bは嘘つき」→ 本当 ○\n・B「Cは嘘つきではない」→ 嘘なのでCは嘘つき → 嘘つきが2人で矛盾 ✗\n\n【Cが嘘つきの場合】\n・C「Aは嘘つきだ」→ 嘘なのでAは正直 ○\n・A「Bは嘘つき」→ 本当なのでBも嘘つき → 嘘つきが2人で矛盾 ✗\n\nよって嘘をついているのはAです。"
      },
      {
        text: "P, Q, R の3人のうち、1人だけが嘘をついている。\n・Pの発言:「私は嘘つきではない」\n・Qの発言:「Pは正直者だ」\n・Rの発言:「Qは嘘つきだ」\n\n嘘をついているのは誰か。",
        choices: ["P", "Q", "R"],
        correctIndex: 2,
        explanation: "場合分けで考えます:\n\n【Pが嘘つきの場合】\n・P「私は嘘つきではない」→ 嘘 → Pは嘘つき（整合）\n・Q「Pは正直者だ」→ Pは嘘つきなので、Qの発言は嘘 → Qも嘘つき → 2人で矛盾 ✗\n\n【Qが嘘つきの場合】\n・Q「Pは正直者だ」→ 嘘 → Pは嘘つき → 2人で矛盾 ✗\n\n【Rが嘘つきの場合】\n・P「私は嘘つきではない」→ 本当 → Pは正直 ○\n・Q「Pは正直者だ」→ 本当 ○\n・R「Qは嘘つきだ」→ 嘘 → Qは正直 ○\n→ 嘘つきはRだけで整合!\n\nよって嘘をついているのはRです。"
      }
    ],
    answerType: "choice",
    timeLimitSec: 150
  });

  // 推論: 位置関係
  QUESTION_TEMPLATES.push({
    id: "suiron_position_01",
    category: "推論",
    categoryId: 1,
    difficulty: 3,
    type: "pattern",
    patterns: [
      {
        text: "A, B, C, D, E, F の6人が円形のテーブルに等間隔に座っている。\n以下のことがわかっている。\n・AとBは隣り合っている\n・CとDは向かい合っている（真向かい）\n・EはAの隣ではない\n・FはCの隣に座っている\n・BはDの隣に座っている\n\nAの向かいに座っているのは誰か。",
        choices: ["C", "D", "E", "F"],
        correctIndex: 2,
        explanation: "6人の円卓では「向かい合い」= 3つ離れた位置（真向かい）。\n\n位置を1〜6として、CとDが向かい合う配置を決める:\nC=1, D=4 と固定。\n\nFはCの隣 → F=2 or F=6。\nBはDの隣 → B=3 or B=5。\nAとBは隣り合う。EはAの隣ではない。\n\nF=6, B=5の場合:\n残り位置2,3にA,Eを配置。\nA=2: Aの隣は1(C)と3 → AとB(5)は隣り合わない ✗\nA=3: Aの隣は2と4(D) → AとB(5)は隣り合わない ✗\n\nF=6, B=3の場合:\n残り位置2,5にA,Eを配置。\nA=2: Aの隣は1(C)と3(B) → AとBが隣り合う ○\n  E=5 → Eの隣は4(D)と6(F) → EはAの隣ではない ○\n  Aの向かい = 位置5 = E ✓\n\nよってAの向かいに座っているのはEです。"
      }
    ],
    answerType: "choice",
    timeLimitSec: 150
  });

  // 推論: 順序推論（追加パターン）
  QUESTION_TEMPLATES.push({
    id: "suiron_order_03",
    category: "推論",
    categoryId: 1,
    difficulty: 1,
    type: "pattern",
    patterns: [
      {
        text: "A, B, C, D の4人が100m走をした。以下のことがわかっている。\n・AはCより速かった\n・DはBより速かった\n・CはDより速かった\n\n最も遅かったのは誰か。",
        choices: ["A", "B", "C", "D"],
        correctIndex: 1,
        explanation: "条件を整理すると:\n・A > C > D > B（速い順）\nよって最も遅かったのはBです。"
      },
      {
        text: "P, Q, R, S の4人のテスト結果について以下のことがわかっている。\n・QはRより高い\n・SはPより高い\n・RはSより高い\n\n最も高い点数だったのは誰か。",
        choices: ["P", "Q", "R", "S"],
        correctIndex: 1,
        explanation: "条件を整理すると:\n・Q > R > S > P（高い順）\nよって最も高い点数だったのはQです。"
      },
      {
        text: "5つの箱 A, B, C, D, E が左から一列に並んでいる。\n以下のことがわかっている。\n・Aは Cより左にある\n・DはBより右にある\n・Bは Aより右にある\n・Eは最も右にある\n・CはBより左にある\n\n左から3番目の箱はどれか。",
        choices: ["A", "B", "C", "D"],
        correctIndex: 1,
        explanation: "条件を整理すると:\n・A < C < B（AはCより左、CはBより左、BはAより右）\n・B < D（DはBより右）\n・E は最も右\n\n以上から: A, C, B, D, E の順\n\nよって左から3番目はBです。"
      }
    ],
    answerType: "choice",
    timeLimitSec: 120
  });

  // 推論: 対応問題（追加パターン）
  QUESTION_TEMPLATES.push({
    id: "suiron_match_02",
    category: "推論",
    categoryId: 1,
    difficulty: 2,
    type: "pattern",
    patterns: [
      {
        text: "A, B, C, D の4人がそれぞれ野球、サッカー、テニス、バスケのいずれかを好む。\n以下のことがわかっている。\n・Aはテニスもバスケも好きではない\n・Bはサッカーを好む\n・Cは野球を好まない\n・Dはテニスを好まない\n\nAが好むスポーツは何か。",
        choices: ["野球", "サッカー", "テニス", "バスケ"],
        correctIndex: 0,
        explanation: "条件を整理:\n・Bはサッカー（確定）\n・Aはテニス✗、バスケ✗、サッカー✗（Bが担当）→ Aは野球\n・Cは野球✗ → Cはテニスかバスケ\n・Dはテニス✗ → Dはバスケ → Cはテニス\n\nよってAは野球を好みます。"
      },
      {
        text: "P, Q, R, S の4人がそれぞれ月、火、水、木のいずれかに休暇を取る（重複なし）。\n以下のことがわかっている。\n・Pは木曜日に休む\n・Qは火曜日には休まない\n・Rは月曜日に休む\n・Sは木曜日には休まない\n\nQが休むのは何曜日か。",
        choices: ["月曜", "火曜", "水曜", "木曜"],
        correctIndex: 2,
        explanation: "条件を整理:\n・Rは月曜（確定）\n・Pは木曜（確定）\n・残りは火曜と水曜にQとS\n・Qは火曜✗ → Qは水曜\n・Sは残りの火曜\n\nよってQは水曜日に休みます。"
      },
      {
        text: "A, B, C の3人がそれぞれ医者、教師、弁護士のいずれかである。\n以下のことがわかっている。\n・Aの職業は教師ではない\n・Bの職業は医者でも弁護士でもない\n・Aの職業は医者ではない\n\nCの職業は何か。",
        choices: ["医者", "教師", "弁護士"],
        correctIndex: 0,
        explanation: "条件を整理:\n・Bは医者✗、弁護士✗ → Bは教師\n・Aは教師✗、医者✗ → Aは弁護士\n・Cは残りの医者\n\nよってCの職業は医者です。"
      }
    ],
    answerType: "choice",
    timeLimitSec: 150
  });

  // 推論: 命題（追加パターン）
  QUESTION_TEMPLATES.push({
    id: "suiron_prop_02",
    category: "推論",
    categoryId: 1,
    difficulty: 2,
    type: "pattern",
    patterns: [
      {
        text: "以下の2つの命題が正しいとき、確実に言えることはどれか。\n・「Aならば B」\n・「Bならば C」",
        choices: [
          "Cならば A",
          "Aならば C",
          "Aでなければ Bでない",
          "Aでなければ Cでない"
        ],
        correctIndex: 1,
        explanation: "「A→B」かつ「B→C」のとき、推移律により「A→C」が成り立ちます。\n\n他の選択肢の検証:\n・「C→A」: 逆は成り立たない ✗\n・「¬A→¬B」: A→Bの逆（裏）であり成り立たない ✗\n・「¬A→¬C」: A→Cの裏であり成り立たない ✗\n\nよって「Aならば C」が正解です。"
      },
      {
        text: "「すべての鳥は飛べる」が偽であることを示すのに十分なものはどれか。",
        choices: [
          "飛べる鳥がいる",
          "飛べない動物がいる",
          "飛べない鳥がいる",
          "鳥でない動物が飛べる"
        ],
        correctIndex: 2,
        explanation: "「すべてのAはBである」の否定は「BでないAが存在する」です。\n\nつまり「すべての鳥は飛べる」の否定は「飛べない鳥がいる」です。\n反例を1つ示せば全称命題は偽になります（例: ペンギン）。"
      },
      {
        text: "「AかつBならばC」が正しいとき、必ず正しいと言えるものはどれか。",
        choices: [
          "AならばC",
          "BならばC",
          "CでなければAでないまたはBでない",
          "CならばAかつB"
        ],
        correctIndex: 2,
        explanation: "「A∧B → C」の対偶は「¬C → ¬A∨¬B」\nつまり「CでなければAでないまたはBでない」です。\n\n対偶は元の命題と同値なので、必ず正しいです。\nAだけやBだけでCが成り立つとは限りません。"
      }
    ],
    answerType: "choice",
    timeLimitSec: 120
  });

  // 推論: 暗号推論
  QUESTION_TEMPLATES.push({
    id: "suiron_code_01",
    category: "推論",
    categoryId: 1,
    difficulty: 3,
    type: "pattern",
    patterns: [
      {
        text: "ある暗号で「いぬ」を「25」、「ねこ」を「73」と表す。\nこの暗号では各文字に固有の数字が割り当てられている。\n\n「こいぬ」はどう表されるか。",
        choices: ["325", "352", "523", "532"],
        correctIndex: 0,
        explanation: "各文字と数字の対応を読み取ります:\n\n「いぬ」= 25 → い=2, ぬ=5\n「ねこ」= 73 → ね=7, こ=3\n\n「こいぬ」= こ(3) + い(2) + ぬ(5) = 325\n\nよって答えは325です。"
      },
      {
        text: "ある規則で数字が並んでいる。\n2, 5, 10, 17, 26, ?\n\n?に入る数字はどれか。",
        choices: ["35", "37", "33", "39"],
        correctIndex: 1,
        explanation: "各項の差を見ると:\n5-2=3, 10-5=5, 17-10=7, 26-17=9\n\n差の列: 3, 5, 7, 9 → 等差数列（公差2）\n次の差: 9+2=11\n\n? = 26 + 11 = 37"
      },
      {
        text: "ある規則で数字が並んでいる。\n1, 1, 2, 3, 5, 8, ?\n\n?に入る数字はどれか。",
        choices: ["11", "12", "13", "14"],
        correctIndex: 2,
        explanation: "フィボナッチ数列: 前の2つの数の和が次の数になる。\n1+1=2, 1+2=3, 2+3=5, 3+5=8\n\n次: 5+8 = 13"
      }
    ],
    answerType: "choice",
    timeLimitSec: 120
  });

  // 推論: 方角・距離
  QUESTION_TEMPLATES.push({
    id: "suiron_direction_01",
    category: "推論",
    categoryId: 1,
    difficulty: 1,
    type: "pattern",
    patterns: [
      {
        text: "Aさんの家から東へ300m歩き、そこから北へ400m歩いた。Aさんの家からの直線距離は何mか。",
        choices: ["500m", "600m", "700m", "350m"],
        correctIndex: 0,
        explanation: "東へ300m、北へ400m → 直角三角形\n\n三平方の定理:\n距離 = √(300² + 400²) = √(90000 + 160000) = √250000 = 500m"
      },
      {
        text: "太郎は自宅から北へ600m歩き、次に西へ800m歩いた。自宅からの直線距離は何mか。",
        choices: ["1000m", "1400m", "900m", "700m"],
        correctIndex: 0,
        explanation: "北へ600m、西へ800m → 直角三角形\n\n三平方の定理:\n距離 = √(600² + 800²) = √(360000 + 640000) = √1000000 = 1000m"
      }
    ],
    answerType: "choice",
    timeLimitSec: 90
  });
})();

// ============================================================
// カテゴリ2: 場合の数・確率
// ============================================================
(function() {
  // 玉の取り出し
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_ball_01",
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 1,
    templateText: "袋の中に赤玉が{{red}}個、白玉が{{white}}個入っている。この袋から同時に2個の玉を取り出すとき、2個とも赤玉である確率を求めよ。",
    variables: {
      red: { type: "int", min: 3, max: 7, step: 1 },
      white: { type: "int", min: 2, max: 5, step: 1 }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var total = v.red + v.white;
      var num = v.red * (v.red - 1) / 2;
      var den = total * (total - 1) / 2;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「同時に取り出す」問題は組み合わせ(C)を使います。\n確率 = 該当する場合の数 / 全体の場合の数\n\n【解法】\n全体の玉の数: {{red}} + {{white}} = {{total}}個\n\n① 全体から2個選ぶ場合の数（分母）:\n  C({{total}}, 2) = {{total}} × {{totalM1}} / 2 = {{den}}通り\n\n② 赤玉2個を選ぶ場合の数（分子）:\n  C({{red}}, 2) = {{red}} × {{redM1}} / 2 = {{num}}通り\n\n③ 確率 = ②÷① = {{num}} / {{den}} = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・C(n, r) = n! / (r! × (n-r)!) は「n個からr個選ぶ組み合わせ」\n・「同時に取り出す」= 順序を考えない = 組み合わせ",
    timeLimitSec: 120
  });

  // サイコロ
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_dice_01",
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 1,
    templateText: "2個のサイコロを同時に投げるとき、出た目の合計が{{target}}になる確率を求めよ。",
    variables: {
      target: { type: "choice", options: [5, 6, 7, 8, 9] }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var count = 0;
      for (var i = 1; i <= 6; i++) {
        for (var j = 1; j <= 6; j++) {
          if (i + j === v.target) count++;
        }
      }
      var g = gcd(count, 36);
      return { numerator: count / g, denominator: 36 / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nサイコロ2個の問題は「全パターンを数えて条件に合うものを探す」が基本。\n全パターンは 6×6 = 36通り（順序を区別する）。\n\n【解法】\n① 全パターン: 6 × 6 = 36通り\n\n② 合計が{{target}}になる組み合わせを列挙:\n{{combinations}}\n→ 該当: {{count}}通り\n\n③ 確率 = {{count}} / 36 = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・2つのサイコロは区別して考える（(1,2)と(2,1)は別パターン）\n・合計7が最も出やすい（6通り）、合計2と12が最も出にくい（各1通り）",
    timeLimitSec: 90
  });

  // コイン
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_coin_01",
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "コインを{{n}}回投げるとき、表がちょうど{{k}}回出る確率を求めよ。",
    variables: {
      n: { type: "choice", options: [3, 4, 5] },
      k: { type: "custom" }  // nに依存して設定
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var num = combination(v.n, v.k);
      var den = Math.pow(2, v.n);
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nコインの問題は「反復試行の確率」。\n全パターン = 2^(回数)、該当パターン = C(回数, 表の回数)。\n\n【解法】\n① 全パターン: 2^{{n}} = {{den}}通り\n  （各回で表or裏の2通り × {{n}}回）\n\n② {{n}}回中{{k}}回だけ表が出る場合の数:\n  「{{n}}回のうちどの{{k}}回が表か」を選ぶ → C({{n}}, {{k}}) = {{num}}通り\n\n③ 確率 = {{num}} / {{den}} = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・反復試行: 各回が独立で同じ確率の試行を繰り返す場合\n・C(n,k) × p^k × (1-p)^(n-k) の公式（コインはp=1/2なので分母が2^n）",
    timeLimitSec: 120
  });

  // カードの問題
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_card_01",
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "1から{{n}}までの数字が書かれたカードが1枚ずつある。この中から同時に2枚引くとき、2枚とも奇数である確率を求めよ。",
    variables: {
      n: { type: "choice", options: [6, 7, 8, 9, 10] }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var oddCount = Math.ceil(v.n / 2);
      var num = oddCount * (oddCount - 1) / 2;
      var den = v.n * (v.n - 1) / 2;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\nまず条件に合うもの（奇数）の個数を数え、そこから2枚選ぶ組み合わせを求めます。\n\n【解法】\n① 1から{{n}}までの奇数の個数: {{oddCount}}個\n  （1, 3, 5, ...を数える）\n\n② 全体から2枚選ぶ場合の数（分母）:\n  C({{n}}, 2) = {{den}}通り\n\n③ 奇数から2枚選ぶ場合の数（分子）:\n  C({{oddCount}}, 2) = {{num}}通り\n\n④ 確率 = {{num}} / {{den}} = {{ansNum}} / {{ansDen}}\n\n【ポイント】\n・「2枚とも○○」の確率 = C(○○の個数, 2) / C(全体, 2)\n・1〜nの奇数の個数は n÷2を切り上げた値",
    timeLimitSec: 120
  });

  // 当たりくじ
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_lottery_01",
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "{{total}}本のくじの中に当たりが{{win}}本入っている。このくじを2本引くとき、少なくとも1本当たる確率を求めよ。",
    variables: {
      total: { type: "choice", options: [8, 10, 12] },
      win: { type: "choice", options: [2, 3] }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var lose = v.total - v.win;
      var allPairs = v.total * (v.total - 1) / 2;
      var losePairs = lose * (lose - 1) / 2;
      var num = allPairs - losePairs;
      var g = gcd(num, allPairs);
      return { numerator: num / g, denominator: allPairs / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「少なくとも1つ」の問題は余事象（=逆の場合）を使うのが定石。\n少なくとも1本当たる確率 = 1 - 全部はずれる確率\n\n【解法】\n① はずれの本数: {{total}} - {{win}} = {{lose}}本\n\n② 全体から2本選ぶ場合の数:\n  C({{total}}, 2) = {{allPairs}}通り\n\n③ はずれ2本を選ぶ場合の数:\n  C({{lose}}, 2) = {{losePairs}}通り\n\n④ 全部はずれる確率 = {{losePairs}} / {{allPairs}}\n\n⑤ 少なくとも1本当たる確率\n  = 1 - {{losePairs}}/{{allPairs}} = {{ansNum}}/{{ansDen}}\n\n【ポイント】\n・「少なくとも1つ」→ 余事象を使う（直接数えると場合分けが複雑になる）\n・余事象: P(A) = 1 - P(Aの逆) は確率の超重要テクニック",
    timeLimitSec: 120
  });

  // 色違いの玉（3色）
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_ball3_01",
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "袋の中に赤玉{{red}}個、白玉{{white}}個、青玉{{blue}}個が入っている。この中から2個を同時に取り出すとき、異なる色の玉が出る確率を求めよ。",
    variables: {
      red: { type: "int", min: 2, max: 5, step: 1 },
      white: { type: "int", min: 2, max: 5, step: 1 },
      blue: { type: "int", min: 2, max: 4, step: 1 }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var total = v.red + v.white + v.blue;
      var allPairs = total * (total - 1) / 2;
      var samePairs = v.red*(v.red-1)/2 + v.white*(v.white-1)/2 + v.blue*(v.blue-1)/2;
      var diffPairs = allPairs - samePairs;
      var g = gcd(diffPairs, allPairs);
      return { numerator: diffPairs / g, denominator: allPairs / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「異なる色」を直接数えると場合分けが多い（赤白、赤青、白青…）ので、\n余事象「同じ色」を使います。異なる色 = 全体 - 同じ色\n\n【解法】\n① 全体: {{red}}+{{white}}+{{blue}} = {{total}}個\n  全ペア数: C({{total}},2) = {{allPairs}}通り\n\n② 同色ペアを数える:\n  赤赤: C({{red}},2) + 白白: C({{white}},2) + 青青: C({{blue}},2)\n  = {{samePairs}}通り\n\n③ 異なる色のペア:\n  {{allPairs}} - {{samePairs}} = {{diffPairs}}通り\n\n④ 確率 = {{diffPairs}}/{{allPairs}} = {{ansNum}}/{{ansDen}}\n\n【ポイント】\n・3色以上ある場合は余事象（同色）から求める方が楽\n・同色の場合の数 = 各色のC(個数, 2)の合計",
    timeLimitSec: 120
  });

  // 並べ替え確率
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_arrange_01",
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 3,
    templateText: "A, B, C, D, E の5文字を無作為に一列に並べるとき、AとBが隣り合う確率を求めよ。",
    variables: {},
    answerType: "fraction",
    answerFormula: function(v) {
      // AB隣り合う: 4!×2 = 48, 全体: 5! = 120
      return { numerator: 2, denominator: 5 };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「隣り合う確率」は、隣り合う2人をまとめて1ブロックと見なすテクニックを使います。\n\n【解法】\n① 全体の並べ方: 5! = 120通り\n\n② AとBが隣り合う場合:\n  ABをひとまとめ（1ブロック）にする\n  → ブロック + 残り3人 = 4組の並び: 4! = 24通り\n  → ブロック内のA,Bの順(AB or BA): 2通り\n  → 隣り合う場合: 24 × 2 = 48通り\n\n③ 確率 = 48/120 = 2/5\n\n【ポイント】\n・「隣り合う」→ まとめて1つとして数え、内部の並びをかける\n・「隣り合わない」→ 1 - 隣り合う確率 で求めるのが楽",
    timeLimitSec: 120
  });

  // 条件付き確率
  QUESTION_TEMPLATES.push({
    id: "kakuritsu_cond_01",
    category: "場合の数・確率",
    categoryId: 2,
    difficulty: 2,
    templateText: "袋に赤玉{{red}}個と白玉{{white}}個が入っている。1個取り出して色を確認し、戻さずにもう1個取り出す。1個目が赤玉だったとき、2個目も赤玉である確率を求めよ。",
    variables: {
      red: { type: "int", min: 3, max: 7, step: 1 },
      white: { type: "int", min: 2, max: 5, step: 1 }
    },
    answerType: "fraction",
    answerFormula: function(v) {
      var num = v.red - 1;
      var den = v.red + v.white - 1;
      var g = gcd(num, den);
      return { numerator: num / g, denominator: den / g };
    },
    unit: "",
    explanationTemplate: "【考え方】\n「戻さずに取り出す」= 条件付き確率。1個目の結果で残りの状態が変わります。\n1個目が赤玉と「わかっている」ので、その後の状態で考えます。\n\n【解法】\n① 1個目が赤玉を取り出した後の残り:\n  赤: {{red}}-1 = {{redM1}}個、白: {{white}}個 → 合計{{denTotal}}個\n\n② 2個目が赤玉の確率 = {{redM1}} / {{denTotal}} = {{ansNum}}/{{ansDen}}\n\n【ポイント】\n・条件付き確率: P(B|A) = 「Aが起きた後にBが起きる確率」\n・「戻さない」→ 毎回残りの状態が変わる → 全体の数も1個減る",
    timeLimitSec: 90
  });
})();

// ============================================================
// カテゴリ3: 集合（ベン図）
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "shugo_2set_01",
    category: "集合",
    categoryId: 3,
    difficulty: 1,
    templateText: "{{total}}人のクラスで、英語が好きな人が{{a}}人、数学が好きな人が{{b}}人、両方好きな人が{{ab}}人いる。英語も数学も好きではない人は何人か。",
    variables: {
      total: { type: "int", min: 30, max: 50, step: 5 },
      a: { type: "int", min: 15, max: 30, step: 1 },
      b: { type: "int", min: 12, max: 25, step: 1 },
      ab: { type: "int", min: 3, max: 10, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total - (v.a + v.b - v.ab);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n2つの集合の問題は「ベン図」を描いてイメージするのが基本。\n重複（両方好き）を引かないと二重カウントしてしまう点に注意。\n\n【解法】\n① ベン図の公式: A∪B = A + B - A∩B\n\n② 英語または数学が好きな人（和集合）:\n  {{a}} + {{b}} - {{ab}} = {{union}}人\n  ※ 両方好きな{{ab}}人を引かないと重複カウントしてしまう\n\n③ どちらも好きではない人:\n  全体 - 和集合 = {{total}} - {{union}} = {{answer}}人\n\n【ポイント】\n・A∪B = A + B - A∩B は集合問題の最重要公式\n・ベン図の外側 = 全体 - ベン図の内側",
    timeLimitSec: 90,
    validate: function(v) {
      var union = v.a + v.b - v.ab;
      return v.ab <= Math.min(v.a, v.b) && union <= v.total && (v.total - union) >= 0;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shugo_2set_02",
    category: "集合",
    categoryId: 3,
    difficulty: 2,
    templateText: "{{total}}人にアンケートを取ったところ、商品Aを買ったことがある人が{{a}}人、商品Bを買ったことがある人が{{b}}人、どちらも買ったことがない人が{{neither}}人だった。両方買ったことがある人は何人か。",
    variables: {
      total: { type: "int", min: 50, max: 100, step: 10 },
      a: { type: "int", min: 20, max: 60, step: 5 },
      b: { type: "int", min: 15, max: 50, step: 5 },
      neither: { type: "int", min: 5, max: 20, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.a + v.b - (v.total - v.neither);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「どちらも買っていない」人数から「どちらか買った（和集合）」を求め、\nそこからベン図の公式を変形して重複（両方買った）を逆算します。\n\n【解法】\n① どちらか一方以上を買った人（和集合）:\n  {{total}} - {{neither}} = {{union}}人\n\n② ベン図の公式: A∪B = A + B - A∩B を変形すると:\n  A∩B = A + B - A∪B\n\n③ 両方買った人:\n  {{a}} + {{b}} - {{union}} = {{answer}}人\n\n【ポイント】\n・和集合の公式は A∩B = の形に変形できる（逆算問題で頻出）\n・「どちらもない」が与えられたら、まず和集合を求める",
    timeLimitSec: 90,
    validate: function(v) {
      var union = v.total - v.neither;
      var both = v.a + v.b - union;
      return both > 0 && both <= Math.min(v.a, v.b);
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shugo_3set_01",
    category: "集合",
    categoryId: 3,
    difficulty: 3,
    templateText: "{{total}}人のクラスで、国語が好きな人が{{a}}人、数学が好きな人が{{b}}人、英語が好きな人が{{c}}人いる。国語と数学の両方が好きな人が{{ab}}人、数学と英語の両方が好きな人が{{bc}}人、国語と英語の両方が好きな人が{{ac}}人、3教科すべてが好きな人が{{abc}}人いる。3教科のどれも好きではない人は何人か。",
    variables: {
      total: { type: "int", min: 40, max: 60, step: 5 },
      a: { type: "int", min: 15, max: 30, step: 1 },
      b: { type: "int", min: 12, max: 25, step: 1 },
      c: { type: "int", min: 10, max: 20, step: 1 },
      ab: { type: "int", min: 3, max: 8, step: 1 },
      bc: { type: "int", min: 2, max: 6, step: 1 },
      ac: { type: "int", min: 2, max: 6, step: 1 },
      abc: { type: "int", min: 1, max: 3, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total - (v.a + v.b + v.c - v.ab - v.bc - v.ac + v.abc);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n3つの集合の問題では「包除原理（ほうじょげんり）」を使います。\n2つずつの重複を引き、3つ全部の重複は引きすぎたので足し戻します。\n\n【解法】\n① 3集合のベン図の公式（包除原理）:\n  A∪B∪C = A + B + C - A∩B - B∩C - A∩C + A∩B∩C\n\n② 代入:\n  = {{a}} + {{b}} + {{c}} - {{ab}} - {{bc}} - {{ac}} + {{abc}}\n  = {{union}}人\n\n③ どれも好きではない人:\n  {{total}} - {{union}} = {{answer}}人\n\n【ポイント】\n・3集合の公式は「足す→2重複を引く→3重複を戻す」の手順\n・3重複を足し戻す理由: 2重複を引く段階で3回引いてしまうため、1回分戻す",
    timeLimitSec: 120,
    validate: function(v) {
      var union = v.a + v.b + v.c - v.ab - v.bc - v.ac + v.abc;
      return v.abc <= Math.min(v.ab, v.bc, v.ac) &&
             v.ab <= Math.min(v.a, v.b) &&
             v.bc <= Math.min(v.b, v.c) &&
             v.ac <= Math.min(v.a, v.c) &&
             union <= v.total && union > 0 && (v.total - union) >= 0;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shugo_2set_03",
    category: "集合",
    categoryId: 3,
    difficulty: 1,
    templateText: "ある会社の社員{{total}}人のうち、電車通勤の人が{{a}}人、バス通勤の人が{{b}}人いる。電車とバスの両方を使う人が最も多い場合、その人数は何人か。",
    variables: {
      total: { type: "int", min: 40, max: 80, step: 10 },
      a: { type: "int", min: 20, max: 50, step: 5 },
      b: { type: "int", min: 15, max: 40, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.min(v.a, v.b);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「両方の最大」は、小さい方の集合が大きい方に完全に含まれる場合。\n全員が重複するのが最大のケースです。\n\n【解法】\n① 電車通勤: {{a}}人、バス通勤: {{b}}人\n\n② 両方使う人の最大値 = min({{a}}, {{b}}) = {{answer}}人\n\n③ 理由: 少ない方の全員が多い方にも含まれる場合が最大\n  （バス通勤者全員が電車通勤者でもある、というケース）\n\n【ポイント】\n・最大 = min(A, B)…小さい方を超えることはできない\n・最小 = max(0, A+B-全体)…鳩の巣原理で最低限の重複",
    timeLimitSec: 90,
    validate: function(v) {
      return v.a + v.b > v.total;
    }
  });

  // 集合: 最小値
  QUESTION_TEMPLATES.push({
    id: "shugo_min_01",
    category: "集合",
    categoryId: 3,
    difficulty: 2,
    templateText: "{{total}}人の社員のうち、英語ができる人が{{a}}人、中国語ができる人が{{b}}人いる。英語と中国語の両方ができる人は少なくとも何人いるか。",
    variables: {
      total: { type: "int", min: 30, max: 60, step: 5 },
      a: { type: "int", min: 15, max: 40, step: 5 },
      b: { type: "int", min: 15, max: 40, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.max(0, v.a + v.b - v.total);
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「少なくとも何人」= 重複の最小値。AとBの合計が全体を超える分は、\nどうしても重複せざるを得ません（鳩の巣原理）。\n\n【解法】\n① A∩Bの最小値の公式:\n  max(0, A + B - 全体)\n\n② 代入:\n  max(0, {{a}} + {{b}} - {{total}}) = {{answer}}人\n\n③ 理由: {{a}}+{{b}} = {{a}}+{{b}} ですが、全体は{{total}}人しかいない\n  → {{a}}+{{b}}-{{total}}人分は必ずどちらにも属する\n\n【ポイント】\n・鳩の巣原理: n個の箱にn+1個入れると、必ずどこかに2つ入る\n・「少なくとも」→ 最小値の公式 max(0, A+B-全体)\n・「最大」→ min(A, B) とセットで覚える",
    timeLimitSec: 90,
    validate: function(v) {
      return v.a + v.b > v.total;
    }
  });

  // 集合: 割合から人数
  QUESTION_TEMPLATES.push({
    id: "shugo_percent_01",
    category: "集合",
    categoryId: 3,
    difficulty: 2,
    templateText: "{{total}}人にアンケートを取ったところ、スポーツが好きな人は全体の{{pctA}}%、音楽が好きな人は全体の{{pctB}}%、両方好きな人は全体の{{pctAB}}%だった。どちらも好きではない人は何人か。",
    variables: {
      total: { type: "int", min: 100, max: 500, step: 50 },
      pctA: { type: "int", min: 30, max: 70, step: 5 },
      pctB: { type: "int", min: 25, max: 60, step: 5 },
      pctAB: { type: "int", min: 5, max: 20, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var unionPct = v.pctA + v.pctB - v.pctAB;
      return v.total * (100 - unionPct) / 100;
    },
    unit: "人",
    explanationTemplate: "【考え方】\n割合(%)で与えられた集合問題。まず%のまま和集合の公式で計算し、\n最後に人数に変換します。\n\n【解法】\n① どちらか好きな人の割合（和集合）:\n  {{pctA}} + {{pctB}} - {{pctAB}} = {{unionPct}}%\n\n② どちらも好きではない割合:\n  100 - {{unionPct}} = {{neitherPct}}%\n\n③ 人数に変換:\n  {{total}} × {{neitherPct}}/100 = {{answer}}人\n\n【ポイント】\n・割合(%やm分率)の問題でもベン図の公式はそのまま使える\n・先に%で計算してから最後に人数に変換するとスムーズ",
    timeLimitSec: 90,
    validate: function(v) {
      var unionPct = v.pctA + v.pctB - v.pctAB;
      return v.pctAB <= Math.min(v.pctA, v.pctB) && unionPct <= 100 && unionPct > 0 &&
             Number.isInteger(v.total * (100 - unionPct) / 100);
    }
  });
})();

// ============================================================
// カテゴリ4: 損益算
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "soneki_basic_01",
    category: "損益算",
    categoryId: 4,
    difficulty: 1,
    templateText: "ある商品を原価{{cost}}円で仕入れ、原価の{{markupRate}}%の利益を見込んで定価をつけた。この商品の定価はいくらか。",
    variables: {
      cost: { type: "int", min: 500, max: 5000, step: 100 },
      markupRate: { type: "choice", options: [10, 20, 25, 30, 40, 50] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.cost * (1 + v.markupRate / 100);
    },
    unit: "円",
    explanationTemplate: "【考え方】\n損益算の基本公式: 定価 = 原価 × (1 + 利益率)\n利益率は「原価の何%」なので、原価に掛けます。\n\n【解法】\n① 定価 = 原価 × (1 + 利益率/100)\n     = {{cost}} × (1 + {{markupRate}}/100)\n     = {{cost}} × {{multiplier}}\n     = {{answer}}円\n\n【ポイント】\n・「原価の○%の利益」= 原価 × (1 + ○/100)\n・定価・原価・利益の関係: 定価 = 原価 + 利益",
    timeLimitSec: 60
  });

  QUESTION_TEMPLATES.push({
    id: "soneki_discount_01",
    category: "損益算",
    categoryId: 4,
    difficulty: 2,
    templateText: "ある商品を原価{{cost}}円で仕入れ、原価の{{markupRate}}%の利益を見込んで定価をつけた。しかし売れなかったので、定価の{{discountRate}}%引きで販売した。このとき、利益はいくらか。",
    variables: {
      cost: { type: "int", min: 1000, max: 5000, step: 500 },
      markupRate: { type: "choice", options: [20, 25, 30, 40, 50] },
      discountRate: { type: "choice", options: [10, 15, 20, 25] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var listPrice = v.cost * (1 + v.markupRate / 100);
      var salePrice = listPrice * (1 - v.discountRate / 100);
      return Math.round(salePrice - v.cost);
    },
    unit: "円",
    explanationTemplate: "【考え方】\n「定価で売れず値引き」は損益算の定番。順番に①定価→②売価→③利益を求めます。\n利益がマイナスなら赤字（損失）です。\n\n【解法】\n① 定価を求める:\n  定価 = {{cost}} × (1 + {{markupRate}}/100) = {{listPrice}}円\n\n② 売価を求める（定価から割引）:\n  売価 = {{listPrice}} × (1 - {{discountRate}}/100) = {{salePrice}}円\n\n③ 利益 = 売価 - 原価:\n  {{salePrice}} - {{cost}} = {{answer}}円\n\n【ポイント】\n・割引は「定価」に対する率、利益率は「原価」に対する率（基準が違う！）\n・利益 = 売価 - 原価（売価は値引き後の実際の販売価格）",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "soneki_loss_01",
    category: "損益算",
    categoryId: 4,
    difficulty: 2,
    templateText: "ある商品に原価の{{markupRate}}%の利益を見込んで{{listPrice}}円の定価をつけた。この商品の原価はいくらか。",
    variables: {
      markupRate: { type: "choice", options: [10, 20, 25, 30, 40, 50] },
      listPrice: { type: "custom" }  // markupRateに合わせて計算
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.listPrice / (1 + v.markupRate / 100));
    },
    unit: "円",
    explanationTemplate: "【考え方】\n定価から原価を逆算する問題。「定価 = 原価 × 倍率」の式を変形して原価を求めます。\n\n【解法】\n① 定価と原価の関係:\n  定価 = 原価 × (1 + {{markupRate}}/100)\n\n② 原価を求める（両辺を倍率で割る）:\n  原価 = 定価 / (1 + {{markupRate}}/100)\n       = {{listPrice}} / {{multiplier}}\n       = {{answer}}円\n\n【ポイント】\n・逆算の基本: 掛け算の逆は割り算\n・「○%増し」の倍率は (1+○/100)。例: 20%増し → 1.2倍",
    timeLimitSec: 90
  });

  QUESTION_TEMPLATES.push({
    id: "soneki_multiple_01",
    category: "損益算",
    categoryId: 4,
    difficulty: 3,
    templateText: "ある商品を{{quantity}}個仕入れ、1個あたりの原価は{{cost}}円だった。そのうち{{sold1}}個を定価（原価の{{markupRate}}%増し）で売り、残りは定価の{{discountRate}}%引きで売った。全体の利益はいくらか。",
    variables: {
      quantity: { type: "choice", options: [10, 20, 50, 100] },
      cost: { type: "int", min: 200, max: 2000, step: 100 },
      sold1: { type: "custom" },
      markupRate: { type: "choice", options: [20, 25, 30, 40, 50] },
      discountRate: { type: "choice", options: [10, 20, 25] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var listPrice = Math.round(v.cost * (1 + v.markupRate / 100));
      var discountPrice = Math.round(listPrice * (1 - v.discountRate / 100));
      var sold2 = v.quantity - v.sold1;
      var revenue = listPrice * v.sold1 + discountPrice * sold2;
      var totalCost = v.cost * v.quantity;
      return revenue - totalCost;
    },
    unit: "円",
    explanationTemplate: "【考え方】\n複数個の商品で一部を定価、残りを割引で売る問題。\n全体の利益 = 総売上 - 総仕入れ原価 で求めます。\n\n【解法】\n① 単価を計算:\n  定価 = {{cost}} × (1 + {{markupRate}}/100) = {{listPrice}}円\n  割引価格 = {{listPrice}} × (1 - {{discountRate}}/100) = {{discountPrice}}円\n\n② 総売上を計算:\n  定価販売: {{listPrice}} × {{sold1}}個\n  割引販売: {{discountPrice}} × {{sold2}}個\n  売上合計 = {{revenue}}円\n\n③ 総仕入れ原価:\n  {{cost}} × {{quantity}} = {{totalCost}}円\n\n④ 全体の利益 = {{revenue}} - {{totalCost}} = {{answer}}円\n\n【ポイント】\n・複数パターンの販売は、それぞれの売上を合計してから原価を引く\n・残り個数 = 仕入れ数 - 定価で売れた数 を忘れずに",
    timeLimitSec: 150
  });

  // 損益算: 売価から原価逆算
  QUESTION_TEMPLATES.push({
    id: "soneki_reverse_01",
    category: "損益算",
    categoryId: 4,
    difficulty: 2,
    templateText: "ある商品を{{salePrice}}円で売ったところ、原価の{{profitRate}}%の利益があった。この商品の原価はいくらか。",
    variables: {
      profitRate: { type: "choice", options: [10, 15, 20, 25, 30] },
      salePrice: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.salePrice / (1 + v.profitRate / 100));
    },
    unit: "円",
    explanationTemplate: "【考え方】\n売価と利益率から原価を逆算する問題。\n売価 = 原価 × (1+利益率) の関係式を変形します。\n\n【解法】\n① 売価と原価の関係:\n  売価 = 原価 × (1 + {{profitRate}}/100)\n\n② 原価を逆算:\n  原価 = 売価 / (1 + {{profitRate}}/100)\n       = {{salePrice}} / {{multiplier}}\n       = {{answer}}円\n\n【ポイント】\n・「○%の利益」= 売価が原価の(1+○/100)倍\n・検算: {{answer}} × {{multiplier}} = {{salePrice}} になればOK",
    timeLimitSec: 90
  });

  // 損益算: 割引後の利益率
  QUESTION_TEMPLATES.push({
    id: "soneki_profitrate_01",
    category: "損益算",
    categoryId: 4,
    difficulty: 3,
    templateText: "原価{{cost}}円の商品に{{markupRate}}%の利益を見込んで定価をつけ、定価の{{discountRate}}%引きで売った。原価に対する利益率は何%か。",
    variables: {
      cost: { type: "int", min: 1000, max: 5000, step: 500 },
      markupRate: { type: "choice", options: [20, 25, 30, 40, 50] },
      discountRate: { type: "choice", options: [10, 15, 20] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var listPrice = Math.round(v.cost * (1 + v.markupRate / 100));
      var salePrice = Math.round(listPrice * (1 - v.discountRate / 100));
      var profit = salePrice - v.cost;
      return Math.round(profit / v.cost * 100);
    },
    unit: "%",
    explanationTemplate: "【考え方】\n値引き後の「原価に対する利益率」を求める問題。\n定価→売価→利益の順に求め、最後に利益率を計算します。\n\n【解法】\n① 定価 = {{cost}} × (1+{{markupRate}}/100) = {{listPrice}}円\n② 売価 = {{listPrice}} × (1-{{discountRate}}/100) = {{salePrice}}円\n③ 利益 = 売価 - 原価 = {{salePrice}} - {{cost}} = {{profit}}円\n④ 利益率 = 利益/原価 × 100 = {{profit}}/{{cost}} × 100 = {{answer}}%\n\n【ポイント】\n・利益率の基準は「原価」（定価ではない！）\n・値上げ率{{markupRate}}%で値引き{{discountRate}}%しても、利益率≠({{markupRate}}-{{discountRate}})%",
    timeLimitSec: 120,
    validate: function(v) {
      var listPrice = Math.round(v.cost * (1 + v.markupRate / 100));
      var salePrice = Math.round(listPrice * (1 - v.discountRate / 100));
      var profit = salePrice - v.cost;
      var rate = profit / v.cost * 100;
      return Math.abs(rate - Math.round(rate)) < 0.01;
    }
  });

  // 損益算: 2つの商品比較
  QUESTION_TEMPLATES.push({
    id: "soneki_compare_01",
    category: "損益算",
    categoryId: 4,
    difficulty: 3,
    templateText: "商品Aは原価{{costA}}円、定価は原価の{{markupA}}%増しで、定価の{{discountA}}%引きで売った。商品Bは原価{{costB}}円、定価は原価の{{markupB}}%増しで、定価の{{discountB}}%引きで売った。2つの商品の利益の差額はいくらか。",
    variables: {
      costA: { type: "int", min: 1000, max: 3000, step: 500 },
      markupA: { type: "choice", options: [20, 30, 40] },
      discountA: { type: "choice", options: [10, 15, 20] },
      costB: { type: "int", min: 1000, max: 3000, step: 500 },
      markupB: { type: "choice", options: [20, 30, 40] },
      discountB: { type: "choice", options: [10, 15, 20] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var profitA = v.costA * (1 + v.markupA/100) * (1 - v.discountA/100) - v.costA;
      var profitB = v.costB * (1 + v.markupB/100) * (1 - v.discountB/100) - v.costB;
      return Math.abs(Math.round(profitA) - Math.round(profitB));
    },
    unit: "円",
    explanationTemplate: "【考え方】\n2つの商品をそれぞれ独立に「定価→売価→利益」で計算し、比較します。\n\n【解法】\n＜商品A＞\n  定価 = {{costA}} × {{mA}} = {{listA}}円\n  売価 = {{listA}} × {{dA}} = {{saleA}}円\n  利益 = {{saleA}} - {{costA}} = {{profitA}}円\n\n＜商品B＞\n  定価 = {{costB}} × {{mB}} = {{listB}}円\n  売価 = {{listB}} × {{dB}} = {{saleB}}円\n  利益 = {{saleB}} - {{costB}} = {{profitB}}円\n\n差額 = |{{profitA}} - {{profitB}}| = {{answer}}円\n\n【ポイント】\n・比較問題は各商品を同じ手順で計算してから差を求める\n・原価、値上げ率、割引率すべてが異なるので慎重に",
    timeLimitSec: 150,
    validate: function(v) {
      var profitA = v.costA * (1+v.markupA/100) * (1-v.discountA/100) - v.costA;
      var profitB = v.costB * (1+v.markupB/100) * (1-v.discountB/100) - v.costB;
      return Math.round(profitA) !== Math.round(profitB);
    }
  });
})();

// ============================================================
// カテゴリ5: 速度算
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "sokudo_basic_01",
    category: "速度算",
    categoryId: 5,
    difficulty: 1,
    templateText: "{{distance}}kmの道のりを時速{{speed}}kmで進むと、何時間何分かかるか。（分単位で答えよ）",
    variables: {
      distance: { type: "int", min: 10, max: 100, step: 5 },
      speed: { type: "choice", options: [4, 5, 6, 10, 12, 15, 20] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.distance / v.speed * 60);
    },
    unit: "分",
    explanationTemplate: "【考え方】\n速度の基本公式「距離 = 速さ × 時間」を変形して時間を求めます。\n\n【解法】\n① 時間 = 距離 / 速さ\n       = {{distance}} / {{speed}}\n       = {{hours}}時間\n\n② 分に変換: {{hours}} × 60 = {{answer}}分\n\n【ポイント】\n・速さの3公式: 距離=速さ×時間、速さ=距離/時間、時間=距離/速さ\n・単位を揃える（km/hならkm、分に変換するなら×60）",
    timeLimitSec: 60,
    validate: function(v) {
      return v.distance % v.speed === 0 || (v.distance * 60 % v.speed === 0);
    }
  });

  QUESTION_TEMPLATES.push({
    id: "sokudo_encounter_01",
    category: "速度算",
    categoryId: 5,
    difficulty: 2,
    templateText: "AとBが{{distance}}km離れた2地点から同時に向かい合って出発した。Aの速さは時速{{speedA}}km、Bの速さは時速{{speedB}}kmである。2人が出会うのは出発してから何分後か。",
    variables: {
      distance: { type: "int", min: 10, max: 60, step: 5 },
      speedA: { type: "choice", options: [3, 4, 5, 6] },
      speedB: { type: "choice", options: [3, 4, 5, 6] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.distance / (v.speedA + v.speedB) * 60);
    },
    unit: "分後",
    explanationTemplate: "【考え方】\n向かい合って進む（出会い）問題では、2人の速さの「和」を使います。\n2人の距離は毎時(速さA+速さB)ずつ縮まるからです。\n\n【解法】\n① 合計速度（距離が縮まる速さ）:\n  {{speedA}} + {{speedB}} = {{totalSpeed}} km/h\n\n② 出会うまでの時間 = 距離 / 合計速度:\n  {{distance}} / {{totalSpeed}} = {{hours}}時間 = {{answer}}分後\n\n【ポイント】\n・向かい合う → 速さの和（距離が縮まる）\n・同じ方向 → 速さの差（距離が縮まる / 広がる）\n・この2パターンを区別するのが速度算のコツ",
    timeLimitSec: 90,
    validate: function(v) {
      return v.speedA !== v.speedB && (v.distance * 60) % (v.speedA + v.speedB) === 0;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "sokudo_chase_01",
    category: "速度算",
    categoryId: 5,
    difficulty: 2,
    templateText: "Aが出発してから{{headStart}}分後にBが同じ方向に出発した。Aの速さは分速{{speedA}}m、Bの速さは分速{{speedB}}mである。BがAに追いつくのはBが出発してから何分後か。",
    variables: {
      headStart: { type: "choice", options: [5, 10, 15, 20] },
      speedA: { type: "choice", options: [60, 70, 80, 100] },
      speedB: { type: "choice", options: [100, 120, 150, 200] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var gap = v.speedA * v.headStart;
      return gap / (v.speedB - v.speedA);
    },
    unit: "分後",
    explanationTemplate: "【考え方】\n追いかけ問題は「先行者との距離差」を「速度の差」で割ります。\n同じ方向に進むので、速い方が速度差の分だけ毎分距離を詰めます。\n\n【解法】\n① Bが出発する時点でのAとBの距離（先行距離）:\n  {{speedA}} × {{headStart}} = {{gap}}m\n\n② 速度の差（毎分縮まる距離）:\n  {{speedB}} - {{speedA}} = {{diff}}m/分\n\n③ 追いつくまでの時間:\n  {{gap}} / {{diff}} = {{answer}}分後\n\n【ポイント】\n・追いかけ → 速さの差で距離を詰める\n・まず「差の距離」を求めてから「差の速度」で割る",
    timeLimitSec: 90,
    validate: function(v) {
      return v.speedB > v.speedA && (v.speedA * v.headStart) % (v.speedB - v.speedA) === 0;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "sokudo_round_01",
    category: "速度算",
    categoryId: 5,
    difficulty: 2,
    templateText: "家から駅まで{{distance}}mある。行きは分速{{speedGo}}mで歩き、帰りは分速{{speedBack}}mで歩いた。往復の平均の速さは分速何mか。",
    variables: {
      distance: { type: "int", min: 500, max: 3000, step: 100 },
      speedGo: { type: "choice", options: [60, 70, 80, 100] },
      speedBack: { type: "choice", options: [40, 50, 60, 80] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var totalDist = v.distance * 2;
      var totalTime = v.distance / v.speedGo + v.distance / v.speedBack;
      return Math.round(totalDist / totalTime);
    },
    unit: "m/分",
    explanationTemplate: "【考え方】\n往復の平均速度は「総距離÷総時間」で求めます。\n速度の単純平均（(行き+帰り)÷2）ではないので注意！\n\n【解法】\n① 往復の総距離:\n  {{distance}} × 2 = {{totalDist}}m\n\n② 各区間の時間:\n  行き: {{distance}} / {{speedGo}} = {{timeGo}}分\n  帰り: {{distance}} / {{speedBack}} = {{timeBack}}分\n  合計: {{timeGo}} + {{timeBack}} = {{totalTime}}分\n\n③ 平均の速さ = 総距離 / 総時間:\n  {{totalDist}} / {{totalTime}} = {{answer}}m/分\n\n【ポイント】\n・平均速度 = 総距離÷総時間（速度の平均ではない！）\n・例: 行き60m/分、帰り40m/分 → 平均は50ではなく48m/分\n・公式: 2×v1×v2/(v1+v2) で一発計算も可能",
    timeLimitSec: 120,
    validate: function(v) {
      var totalDist = v.distance * 2;
      var totalTime = v.distance / v.speedGo + v.distance / v.speedBack;
      var result = totalDist / totalTime;
      return v.speedGo > v.speedBack && Math.abs(result - Math.round(result)) < 0.01;
    }
  });

  // 速度算: 時速・分速・秒速の変換
  QUESTION_TEMPLATES.push({
    id: "sokudo_convert_01",
    category: "速度算",
    categoryId: 5,
    difficulty: 1,
    templateText: "時速{{speedKmh}}kmは秒速何mか。（小数点以下を四捨五入）",
    variables: {
      speedKmh: { type: "choice", options: [36, 54, 72, 90, 108, 144] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.speedKmh * 1000 / 3600);
    },
    unit: "m/秒",
    explanationTemplate: "【考え方】\n単位変換は「距離の単位」と「時間の単位」をそれぞれ変換します。\nkm→m（×1000）、時→秒（÷3600）を同時に行います。\n\n【解法】\n① 時速 → 秒速の変換:\n  時速{{speedKmh}}km = {{speedKmh}} × 1000 / 3600 m/秒\n  = {{speedKmh}} / 3.6\n  = {{answer}} m/秒\n\n【ポイント】\n・時速(km/h) → 秒速(m/s): ÷3.6\n・秒速(m/s) → 時速(km/h): ×3.6\n・3.6 = 3600÷1000（秒÷メートル換算）\n・よく出る値: 時速36km=秒速10m、時速72km=秒速20m",
    timeLimitSec: 60
  });

  // 速度算: 電車のすれ違い
  QUESTION_TEMPLATES.push({
    id: "sokudo_train_01",
    category: "速度算",
    categoryId: 5,
    difficulty: 3,
    templateText: "長さ{{lenA}}mの電車Aが時速{{speedA}}kmで走っている。長さ{{lenB}}mの電車Bが反対方向から時速{{speedB}}kmで走ってきた。2つの電車がすれ違い始めてからすれ違い終わるまで何秒かかるか。",
    variables: {
      lenA: { type: "int", min: 100, max: 250, step: 50 },
      lenB: { type: "int", min: 100, max: 250, step: 50 },
      speedA: { type: "choice", options: [54, 72, 90] },
      speedB: { type: "choice", options: [54, 72, 90] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var totalLen = v.lenA + v.lenB;
      var totalSpeed = (v.speedA + v.speedB) * 1000 / 3600; // m/秒
      return Math.round(totalLen / totalSpeed);
    },
    unit: "秒",
    explanationTemplate: "【考え方】\n電車のすれ違い問題は「進む距離」と「相対速度」がポイント。\n反対方向 → 速度の和、同じ方向 → 速度の差。\nすれ違う距離 = 2つの電車の長さの合計です。\n\n【解法】\n① すれ違う距離（先頭が出会ってから最後尾が離れるまで）:\n  電車A + 電車B = {{lenA}} + {{lenB}} = {{totalLen}}m\n\n② 相対速度（反対方向なので速さの和）:\n  {{speedA}} + {{speedB}} = {{totalSpeedKmh}}km/h\n  秒速に変換: {{totalSpeedKmh}} / 3.6 = {{totalSpeedMs}}m/秒\n\n③ すれ違い時間 = 距離 / 速度:\n  {{totalLen}} / {{totalSpeedMs}} = {{answer}}秒\n\n【ポイント】\n・すれ違い → 進む距離 = 両方の長さの合計、速度 = 和\n・追い越し → 進む距離 = 両方の長さの合計、速度 = 差\n・単位変換（km/h → m/s）を忘れずに",
    timeLimitSec: 120,
    validate: function(v) {
      var totalLen = v.lenA + v.lenB;
      var totalSpeed = (v.speedA + v.speedB) * 1000 / 3600;
      var result = totalLen / totalSpeed;
      return Math.abs(result - Math.round(result)) < 0.01;
    }
  });

  // 速度算: 遅刻・早着
  QUESTION_TEMPLATES.push({
    id: "sokudo_late_01",
    category: "速度算",
    categoryId: 5,
    difficulty: 2,
    templateText: "家から学校まで分速{{speedSlow}}mで歩くと始業に{{late}}分遅刻するが、分速{{speedFast}}mで歩くと始業{{early}}分前に着く。家から学校までの距離は何mか。",
    variables: {
      speedSlow: { type: "choice", options: [60, 70, 80] },
      speedFast: { type: "choice", options: [100, 120, 150] },
      late: { type: "choice", options: [3, 5, 8, 10] },
      early: { type: "choice", options: [5, 8, 10, 15] }
    },
    answerType: "number",
    answerFormula: function(v) {
      // 遅い速度: t分かかる → t = d/speedSlow
      // 速い速度: (t - late - early)分 = d/speedFast
      // d/speedSlow - d/speedFast = late + early
      var timeDiff = v.late + v.early;
      var d = timeDiff / (1/v.speedSlow - 1/v.speedFast);
      return Math.round(d);
    },
    unit: "m",
    explanationTemplate: "【考え方】\n同じ距離を2つの速度で歩いた時の「時間の差」から距離を逆算します。\n遅い方が到着遅れ分+早い方の余裕分 = 所要時間の差です。\n\n【解法】\n① 2つの速度での所要時間の差:\n  遅い方が{{late}}分遅く、速い方が{{early}}分早い\n  → 時間差 = {{late}} + {{early}} = {{timeDiff}}分\n\n② 距離をdとして方程式を立てる:\n  d/{{speedSlow}} - d/{{speedFast}} = {{timeDiff}}\n  d × (1/{{speedSlow}} - 1/{{speedFast}}) = {{timeDiff}}\n\n③ 距離を求める:\n  d = {{timeDiff}} / (1/{{speedSlow}} - 1/{{speedFast}})\n  d = {{answer}}m\n\n【ポイント】\n・「遅刻○分」と「早着△分」→ 時間差 = ○+△\n・同じ距離を異なる速度で移動 → 距離=(時間差)÷(1/遅-1/速)\n・SPI頻出パターン。公式として覚えてもOK",
    timeLimitSec: 120,
    validate: function(v) {
      var timeDiff = v.late + v.early;
      var d = timeDiff / (1/v.speedSlow - 1/v.speedFast);
      return v.speedFast > v.speedSlow && d > 0 && Math.abs(d - Math.round(d)) < 0.01;
    }
  });
})();

// ============================================================
// カテゴリ6: 仕事算
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "shigoto_basic_01",
    category: "仕事算",
    categoryId: 6,
    difficulty: 1,
    templateText: "ある仕事をAだけですると{{daysA}}日かかり、Bだけですると{{daysB}}日かかる。AとBが一緒にこの仕事をすると何日かかるか。",
    variables: {
      daysA: { type: "choice", options: [6, 8, 10, 12, 15, 20] },
      daysB: { type: "choice", options: [6, 8, 10, 12, 15, 20, 30] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.daysA * v.daysB / (v.daysA + v.daysB);
    },
    unit: "日",
    explanationTemplate: "【考え方】\n仕事算の基本: 仕事全体を「1」として、1日あたりの仕事量を分数で表します。\n2人で同時にやれば仕事量が足し算になります。\n\n【解法】\n① 仕事全体を1とする\n\n② 1日あたりの仕事量:\n  A: 1/{{daysA}}\n  B: 1/{{daysB}}\n\n③ 2人の1日の合計仕事量:\n  1/{{daysA}} + 1/{{daysB}} = {{combined}}\n\n④ かかる日数 = 全体÷1日の仕事量:\n  1 / {{combined}} = {{answer}}日\n\n【ポイント】\n・仕事全体を1とおく → 「○日で完了」= 1日に1/○ずつ進む\n・公式: A×B/(A+B) 日で一発計算も可能\n・仕事算は「速さ」の問題と同じ構造（仕事量=速さ×時間）",
    timeLimitSec: 90,
    validate: function(v) {
      return v.daysA !== v.daysB && Number.isInteger(v.daysA * v.daysB / (v.daysA + v.daysB));
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shigoto_switch_01",
    category: "仕事算",
    categoryId: 6,
    difficulty: 2,
    templateText: "ある仕事をAだけですると{{daysA}}日、Bだけですると{{daysB}}日かかる。最初にAが{{daysAlone}}日間1人で仕事をし、残りをBが1人で仕上げた。Bが仕事をした日数は何日か。",
    variables: {
      daysA: { type: "choice", options: [6, 10, 12, 15, 20] },
      daysB: { type: "choice", options: [6, 10, 12, 15, 20] },
      daysAlone: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      var remaining = 1 - v.daysAlone / v.daysA;
      return Math.round(remaining * v.daysB);
    },
    unit: "日",
    explanationTemplate: "【考え方】\n途中で作業者が交代する問題。\nまずAが進めた分を計算し、残りをBが仕上げる日数を求めます。\n\n【解法】\n① 仕事全体を1とする\n\n② Aが{{daysAlone}}日間で進めた仕事量:\n  1日の仕事量: 1/{{daysA}}\n  {{daysAlone}}日分: {{daysAlone}}/{{daysA}} = {{aDone}}\n\n③ 残りの仕事量:\n  1 - {{aDone}} = {{remaining}}\n\n④ Bが残りを仕上げる日数:\n  Bの1日の仕事量: 1/{{daysB}}\n  日数 = {{remaining}} ÷ (1/{{daysB}}) = {{remaining}} × {{daysB}} = {{answer}}日\n\n【ポイント】\n・「途中交代」→ まず先の人の進捗を計算 → 残りを後の人で\n・残り = 1 - (先の人の日数/全体日数)",
    timeLimitSec: 120,
    validate: function(v) {
      var remaining = 1 - v.daysAlone / v.daysA;
      var result = remaining * v.daysB;
      return v.daysA !== v.daysB && v.daysAlone < v.daysA && remaining > 0 && Math.abs(result - Math.round(result)) < 0.01;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "shigoto_3people_01",
    category: "仕事算",
    categoryId: 6,
    difficulty: 2,
    templateText: "ある仕事をAだけですると{{daysA}}日、Bだけですると{{daysB}}日、Cだけですると{{daysC}}日かかる。3人で一緒に仕事をすると何日かかるか。",
    variables: {
      daysA: { type: "choice", options: [4, 6, 8, 10, 12] },
      daysB: { type: "choice", options: [6, 8, 10, 12, 15] },
      daysC: { type: "choice", options: [8, 10, 12, 15, 20, 24] }
    },
    answerType: "number",
    answerFormula: function(v) {
      var rate = 1/v.daysA + 1/v.daysB + 1/v.daysC;
      return Math.round(1 / rate);
    },
    unit: "日",
    explanationTemplate: "【考え方】\n2人の仕事算と同じ考え方を3人に拡張します。\n3人の1日の仕事量をすべて足し算します。\n\n【解法】\n① 仕事全体を1とする\n\n② 1日あたりの仕事量:\n  A: 1/{{daysA}}\n  B: 1/{{daysB}}\n  C: 1/{{daysC}}\n\n③ 3人合計の1日の仕事量:\n  1/{{daysA}} + 1/{{daysB}} + 1/{{daysC}} = {{combined}}\n\n④ かかる日数:\n  1 / {{combined}} = {{answer}}日\n\n【ポイント】\n・何人でも同じ方法: 全員の1日の仕事量を合計 → 逆数が日数\n・通分して計算する → 最小公倍数を使うと楽",
    timeLimitSec: 120,
    validate: function(v) {
      var rate = 1/v.daysA + 1/v.daysB + 1/v.daysC;
      return v.daysA !== v.daysB && v.daysB !== v.daysC && v.daysA !== v.daysC && Math.abs(1/rate - Math.round(1/rate)) < 0.01;
    }
  });

  // 仕事算: 水槽
  QUESTION_TEMPLATES.push({
    id: "shigoto_tank_01",
    category: "仕事算",
    categoryId: 6,
    difficulty: 1,
    templateText: "ある水槽を満水にするのにポンプAだけでは{{hoursA}}時間、ポンプBだけでは{{hoursB}}時間かかる。両方のポンプを同時に使うと何時間で満水になるか。",
    variables: {
      hoursA: { type: "choice", options: [3, 4, 5, 6, 8, 10] },
      hoursB: { type: "choice", options: [4, 5, 6, 8, 10, 12] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.hoursA * v.hoursB / (v.hoursA + v.hoursB);
    },
    unit: "時間",
    explanationTemplate: "【考え方】\n水槽問題は仕事算の応用。水槽を満たす仕事を「1」として、\n各ポンプの1時間あたりの仕事量を足し合わせます。\n\n【解法】\n① 水槽の容量を1とする\n\n② 1時間あたりの仕事量:\n  ポンプA: 1/{{hoursA}}\n  ポンプB: 1/{{hoursB}}\n\n③ 2台同時の1時間の仕事量:\n  1/{{hoursA}} + 1/{{hoursB}} = ({{hoursA}}+{{hoursB}}) / ({{hoursA}}×{{hoursB}})\n\n④ 満水までの時間:\n  1 ÷ 合計仕事量 = {{answer}}時間\n\n【ポイント】\n・水槽問題 = 仕事算と完全に同じ解法\n・「注水」と「排水」が両方ある場合は引き算になる\n・公式: A×B/(A+B) で一発計算可能",
    timeLimitSec: 90,
    validate: function(v) {
      return v.hoursA !== v.hoursB && Number.isInteger(v.hoursA * v.hoursB / (v.hoursA + v.hoursB));
    }
  });

  // 仕事算: 効率の違い
  QUESTION_TEMPLATES.push({
    id: "shigoto_efficiency_01",
    category: "仕事算",
    categoryId: 6,
    difficulty: 1,
    templateText: "ある仕事を仕上げるのにAは{{daysA}}日かかる。BはAの{{ratio}}倍の速さで仕事ができる。Bだけでこの仕事をすると何日かかるか。",
    variables: {
      daysA: { type: "choice", options: [6, 8, 10, 12, 15, 20, 24, 30] },
      ratio: { type: "choice", options: [2, 3, 4, 5, 6] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.daysA / v.ratio;
    },
    unit: "日",
    explanationTemplate: "【考え方】\n「速さが○倍」= 「かかる時間は1/○倍」です。\n速さと時間は反比例の関係にあります。\n\n【解法】\n① BはAの{{ratio}}倍の速さで仕事ができる\n  → 同じ仕事を 1/{{ratio}} の時間で完了できる\n\n② Bの日数 = Aの日数 / {{ratio}}\n  = {{daysA}} / {{ratio}} = {{answer}}日\n\n【ポイント】\n・速さ(効率)が○倍 → 時間は1/○倍（反比例）\n・例: 2倍速ければ半分の時間で終わる\n・逆に「○倍の時間がかかる」= 速さは1/○倍",
    timeLimitSec: 60,
    validate: function(v) {
      return Number.isInteger(v.daysA / v.ratio);
    }
  });

  // 仕事算: 途中から合流
  QUESTION_TEMPLATES.push({
    id: "shigoto_join_01",
    category: "仕事算",
    categoryId: 6,
    difficulty: 3,
    templateText: "ある仕事をAだけですると{{daysA}}日かかる。Aが{{daysAlone}}日間1人で仕事をした後、Bが加わって2人で残りを仕上げたところ、さらに{{daysTogether}}日かかった。Bだけでこの仕事をすると何日かかるか。",
    variables: {
      daysA: { type: "choice", options: [10, 12, 15, 18, 20] },
      daysAlone: { type: "custom" },
      daysTogether: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      // A単独でdaysAlone日: daysAlone/daysA 完了
      // 残り: 1 - daysAlone/daysA
      // 2人でdaysTogether日: daysTogether*(1/daysA + 1/daysB) = 残り
      // 1/daysB = (残り/daysTogether) - 1/daysA
      var remaining = 1 - v.daysAlone / v.daysA;
      var bRate = remaining / v.daysTogether - 1 / v.daysA;
      return Math.round(1 / bRate);
    },
    unit: "日",
    explanationTemplate: "【考え方】\nBの仕事速度が未知の逆算問題。\nAの単独作業→A+Bの共同作業の情報からBの速度を求めます。\n\n【解法】\n① 仕事全体を1とする\n\n② Aが{{daysAlone}}日間で進めた仕事量:\n  {{daysAlone}}/{{daysA}} = {{aDone}}\n\n③ 残りの仕事量:\n  1 - {{aDone}} = {{remaining}}\n\n④ 2人で{{daysTogether}}日かけて残りを完了:\n  (1/{{daysA}} + 1/B) × {{daysTogether}} = {{remaining}}\n\n⑤ Bの1日の仕事量を求める:\n  1/B = {{remaining}}/{{daysTogether}} - 1/{{daysA}}\n\n⑥ Bだけでかかる日数:\n  B = {{answer}}日\n\n【ポイント】\n・「途中から合流」→ 残りの仕事量を方程式で立てる\n・1/B = (残り÷日数) - 1/A → B = その逆数",
    timeLimitSec: 150,
    validate: function(v) {
      var remaining = 1 - v.daysAlone / v.daysA;
      var bRate = remaining / v.daysTogether - 1 / v.daysA;
      return bRate > 0 && Number.isInteger(Math.round(1/bRate)) && Math.abs(1/bRate - Math.round(1/bRate)) < 0.01;
    }
  });
})();

// ============================================================
// カテゴリ7: 濃度算
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "noudo_basic_01",
    category: "濃度算",
    categoryId: 7,
    difficulty: 1,
    templateText: "{{water}}gの水に{{salt}}gの食塩を溶かした。この食塩水の濃度は何%か。（小数第2位を四捨五入）",
    variables: {
      water: { type: "int", min: 100, max: 500, step: 50 },
      salt: { type: "int", min: 10, max: 50, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round(v.salt / (v.water + v.salt) * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n濃度の基本公式: 濃度(%) = 食塩の量 / 食塩水の量 × 100\n食塩水の量 = 水 + 食塩（食塩も含むことに注意！）\n\n【解法】\n① 食塩水の総量:\n  水 + 食塩 = {{water}} + {{salt}} = {{total}}g\n\n② 濃度を計算:\n  濃度 = 食塩 / 食塩水 × 100\n       = {{salt}} / {{total}} × 100\n       = {{answer}}%\n\n【ポイント】\n・食塩水の量 = 水 + 食塩（分母に食塩も含む！）\n・「水の量」と「食塩水の量」は違う → よくあるひっかけ\n・濃度は常に0〜100%の範囲",
    timeLimitSec: 60
  });

  QUESTION_TEMPLATES.push({
    id: "noudo_mix_01",
    category: "濃度算",
    categoryId: 7,
    difficulty: 2,
    templateText: "濃度{{concA}}%の食塩水{{weightA}}gと、濃度{{concB}}%の食塩水{{weightB}}gを混ぜると、濃度は何%になるか。（小数第2位を四捨五入）",
    variables: {
      concA: { type: "choice", options: [3, 4, 5, 6, 8, 10] },
      weightA: { type: "int", min: 100, max: 500, step: 50 },
      concB: { type: "choice", options: [8, 10, 12, 15, 20] },
      weightB: { type: "int", min: 100, max: 500, step: 50 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var saltA = v.weightA * v.concA / 100;
      var saltB = v.weightB * v.concB / 100;
      var totalSalt = saltA + saltB;
      var totalWeight = v.weightA + v.weightB;
      return Math.round(totalSalt / totalWeight * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n混合問題は「食塩の量は足し算、食塩水の量も足し算」。\nそれぞれの食塩量を求めてから合計の濃度を計算します。\n\n【解法】\n① 各食塩水の食塩量を求める:\n  A: {{weightA}} × {{concA}}/100 = {{saltA}}g\n  B: {{weightB}} × {{concB}}/100 = {{saltB}}g\n\n② 合計:\n  食塩の合計: {{saltA}} + {{saltB}} = {{totalSalt}}g\n  食塩水の合計: {{weightA}} + {{weightB}} = {{totalWeight}}g\n\n③ 混合後の濃度:\n  {{totalSalt}} / {{totalWeight}} × 100 = {{answer}}%\n\n【ポイント】\n・混合後の濃度は必ず2つの濃度の間の値になる\n・「てんびん図」を使うと素早く解ける（重さの比で内分）\n・食塩の量 = 食塩水の量 × 濃度/100 は濃度算の超基本",
    timeLimitSec: 120,
    validate: function(v) {
      return v.concA < v.concB;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "noudo_evaporate_01",
    category: "濃度算",
    categoryId: 7,
    difficulty: 2,
    templateText: "濃度{{conc}}%の食塩水が{{weight}}gある。水を{{evap}}g蒸発させると、濃度は何%になるか。（小数第2位を四捨五入）",
    variables: {
      conc: { type: "choice", options: [5, 8, 10] },
      weight: { type: "int", min: 200, max: 500, step: 50 },
      evap: { type: "int", min: 50, max: 200, step: 50 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var salt = v.weight * v.conc / 100;
      var newWeight = v.weight - v.evap;
      return Math.round(salt / newWeight * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n水を蒸発させると「食塩の量は変わらず、食塩水の量だけ減る」。\nよって濃度は上がります。\n\n【解法】\n① 元の食塩の量（蒸発しても変わらない）:\n  {{weight}} × {{conc}}/100 = {{salt}}g\n\n② 蒸発後の食塩水の量:\n  {{weight}} - {{evap}} = {{newWeight}}g\n\n③ 新しい濃度:\n  {{salt}} / {{newWeight}} × 100 = {{answer}}%\n\n【ポイント】\n・蒸発 → 水だけ減る → 食塩はそのまま → 濃度UP\n・水を加える → 水だけ増える → 食塩はそのまま → 濃度DOWN\n・どちらも「食塩の量は不変」がカギ",
    timeLimitSec: 90,
    validate: function(v) {
      return v.evap < v.weight;
    }
  });

  // 濃度算: 水を追加
  QUESTION_TEMPLATES.push({
    id: "noudo_addwater_01",
    category: "濃度算",
    categoryId: 7,
    difficulty: 1,
    templateText: "濃度{{conc}}%の食塩水{{weight}}gに水を{{addWater}}g加えると、濃度は何%になるか。（小数第2位を四捨五入）",
    variables: {
      conc: { type: "choice", options: [5, 8, 10, 12, 15] },
      weight: { type: "int", min: 200, max: 500, step: 50 },
      addWater: { type: "int", min: 50, max: 300, step: 50 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var salt = v.weight * v.conc / 100;
      var newWeight = v.weight + v.addWater;
      return Math.round(salt / newWeight * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n水を加えると「食塩の量は変わらず、食塩水の量だけ増える」。\nよって濃度は下がります。\n\n【解法】\n① 食塩の量（水を加えても変わらない）:\n  {{weight}} × {{conc}}/100 = {{salt}}g\n\n② 水を加えた後の食塩水の量:\n  {{weight}} + {{addWater}} = {{newWeight}}g\n\n③ 新しい濃度:\n  {{salt}} / {{newWeight}} × 100 = {{answer}}%\n\n【ポイント】\n・水を加える → 食塩はそのまま、食塩水が増える → 濃度DOWN\n・食塩を加える場合は「食塩も食塩水も増える」ので別の計算になる",
    timeLimitSec: 90
  });

  // 濃度算: 食塩を追加
  QUESTION_TEMPLATES.push({
    id: "noudo_addsalt_01",
    category: "濃度算",
    categoryId: 7,
    difficulty: 2,
    templateText: "濃度{{conc}}%の食塩水{{weight}}gに食塩を{{addSalt}}g加えると、濃度は何%になるか。（小数第2位を四捨五入）",
    variables: {
      conc: { type: "choice", options: [3, 5, 8, 10] },
      weight: { type: "int", min: 200, max: 500, step: 50 },
      addSalt: { type: "int", min: 5, max: 30, step: 5 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var salt = v.weight * v.conc / 100 + v.addSalt;
      var newWeight = v.weight + v.addSalt;
      return Math.round(salt / newWeight * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n食塩を加えると「食塩の量も食塩水の量も増える」。\n両方の変化を反映して新しい濃度を求めます。\n\n【解法】\n① 元の食塩の量:\n  {{weight}} × {{conc}}/100 = {{origSalt}}g\n\n② 食塩を加えた後:\n  新しい食塩の量: {{origSalt}} + {{addSalt}} = {{totalSalt}}g\n  新しい食塩水の量: {{weight}} + {{addSalt}} = {{newWeight}}g\n  ※食塩を加えると食塩水の量も増える！\n\n③ 新しい濃度:\n  {{totalSalt}} / {{newWeight}} × 100 = {{answer}}%\n\n【ポイント】\n・食塩を加える → 分子(食塩)も分母(食塩水)も増える → 濃度UP\n・水を加える場合は分母だけ増える → 濃度DOWN（区別する）",
    timeLimitSec: 90
  });

  // 濃度算: 目標濃度にするための混合量
  QUESTION_TEMPLATES.push({
    id: "noudo_target_01",
    category: "濃度算",
    categoryId: 7,
    difficulty: 3,
    templateText: "濃度{{concA}}%の食塩水{{weightA}}gに、濃度{{concB}}%の食塩水を何g混ぜると濃度{{concTarget}}%になるか。",
    variables: {
      concA: { type: "choice", options: [3, 4, 5] },
      weightA: { type: "int", min: 100, max: 400, step: 50 },
      concB: { type: "choice", options: [10, 12, 15, 20] },
      concTarget: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      // concA * weightA + concB * x = concTarget * (weightA + x)
      // x = weightA * (concTarget - concA) / (concB - concTarget)
      return Math.round(v.weightA * (v.concTarget - v.concA) / (v.concB - v.concTarget));
    },
    unit: "g",
    explanationTemplate: "【考え方】\n目標の濃度にするために必要な量を求める逆算問題。\n食塩の量について方程式を立てて解きます。\n\n【解法】\n① 食塩水Bの量をxgとする\n\n② 食塩の量の等式（混合前=混合後）:\n  A由来 + B由来 = 混合後全体\n  {{weightA}}×{{concA}}/100 + x×{{concB}}/100 = ({{weightA}}+x)×{{concTarget}}/100\n\n③ 両辺を100倍して整理:\n  {{concA}}×{{weightA}} + {{concB}}×x = {{concTarget}}×({{weightA}}+x)\n  ({{concB}}-{{concTarget}})×x = {{concTarget}}×{{weightA}} - {{concA}}×{{weightA}}\n\n④ xを求める:\n  x = {{answer}}g\n\n【ポイント】\n・「食塩の量」で方程式を立てるのが濃度算の定石\n・混合前の食塩の合計 = 混合後の食塩の合計\n・「てんびん図」でも解ける: A×(目標-A濃度) = x×(B濃度-目標)",
    timeLimitSec: 150,
    validate: function(v) {
      var x = v.weightA * (v.concTarget - v.concA) / (v.concB - v.concTarget);
      return v.concTarget > v.concA && v.concTarget < v.concB && x > 0 && Math.abs(x - Math.round(x)) < 0.01;
    }
  });

  // 濃度算: 一部取り出して水を加える
  QUESTION_TEMPLATES.push({
    id: "noudo_replace_01",
    category: "濃度算",
    categoryId: 7,
    difficulty: 3,
    templateText: "濃度{{conc}}%の食塩水{{weight}}gから{{remove}}gを取り出し、代わりに同量の水を加えた。新しい濃度は何%か。（小数第2位を四捨五入）",
    variables: {
      conc: { type: "choice", options: [5, 8, 10, 12, 15] },
      weight: { type: "int", min: 200, max: 500, step: 50 },
      remove: { type: "int", min: 50, max: 200, step: 50 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var origSalt = v.weight * v.conc / 100;
      var removedSalt = v.remove * v.conc / 100;
      var newSalt = origSalt - removedSalt;
      return Math.round(newSalt / v.weight * 1000) / 10;
    },
    unit: "%",
    explanationTemplate: "【考え方】\n「取り出して水で補充」の問題。取り出した食塩水にも食塩が含まれるので、\nその分だけ食塩が減ります。全体の量は変わりません。\n\n【解法】\n① 元の食塩の量:\n  {{weight}} × {{conc}}/100 = {{origSalt}}g\n\n② 取り出した食塩水に含まれる食塩:\n  {{remove}} × {{conc}}/100 = {{removedSalt}}g\n  ※取り出す食塩水も元と同じ濃度！\n\n③ 残った食塩の量:\n  {{origSalt}} - {{removedSalt}} = {{newSalt}}g\n\n④ 水を{{remove}}g加えるので全体量は{{weight}}gのまま\n\n⑤ 新しい濃度:\n  {{newSalt}} / {{weight}} × 100 = {{answer}}%\n\n【ポイント】\n・取り出す食塩水は元の濃度と同じ（よく混ざっている前提）\n・全体量が変わらないのがこの問題のミソ\n・公式: 新濃度 = 元の濃度 × (1 - 取り出す量/全体量)",
    timeLimitSec: 120,
    validate: function(v) {
      return v.remove < v.weight;
    }
  });
})();

// ============================================================
// カテゴリ8: 割合・比
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "wariai_basic_01",
    category: "割合・比",
    categoryId: 8,
    difficulty: 1,
    templateText: "ある学校の生徒数は{{total}}人で、そのうち{{percent}}%が女子である。女子の人数は何人か。",
    variables: {
      total: { type: "int", min: 100, max: 800, step: 50 },
      percent: { type: "choice", options: [20, 25, 30, 35, 40, 45, 50, 55, 60] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total * v.percent / 100;
    },
    unit: "人",
    explanationTemplate: "【考え方】\n割合の基本: 全体 × 割合(%) / 100 = 該当する部分の量\n\n【解法】\n① 女子の人数 = 全体 × 割合:\n  {{total}} × {{percent}}/100 = {{answer}}人\n\n【ポイント】\n・割合の3公式: 量=全体×割合、割合=量/全体、全体=量/割合\n・%は÷100、割(わり)は÷10で計算",
    timeLimitSec: 60,
    validate: function(v) {
      return Number.isInteger(v.total * v.percent / 100);
    }
  });

  QUESTION_TEMPLATES.push({
    id: "wariai_change_01",
    category: "割合・比",
    categoryId: 8,
    difficulty: 2,
    templateText: "ある商品の価格が{{original}}円から{{changed}}円に変わった。値上がり率は何%か。（小数点以下を四捨五入して答えよ）",
    variables: {
      original: { type: "int", min: 500, max: 5000, step: 100 },
      changed: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round((v.changed - v.original) / v.original * 100);
    },
    unit: "%",
    explanationTemplate: "【考え方】\n変化率(増加率) = 変化量 / もとの量 × 100\n基準は必ず「もとの量（変化前）」です。\n\n【解法】\n① 変化量（値上がり額）:\n  {{changed}} - {{original}} = {{diff}}円\n\n② 値上がり率:\n  {{diff}} / {{original}} × 100 = {{answer}}%\n\n【ポイント】\n・変化率の基準は「変化前の値」（変化後ではない！）\n・値下がりの場合: (元-後)/元 × 100 で求める\n・「○円が△円に」→ 基準は○円",
    timeLimitSec: 90
  });

  QUESTION_TEMPLATES.push({
    id: "wariai_ratio_01",
    category: "割合・比",
    categoryId: 8,
    difficulty: 2,
    templateText: "AとBの比が{{ratioA}}:{{ratioB}}で、合計が{{total}}のとき、Aはいくらか。",
    variables: {
      ratioA: { type: "int", min: 1, max: 7, step: 1 },
      ratioB: { type: "int", min: 1, max: 7, step: 1 },
      total: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.total * v.ratioA / (v.ratioA + v.ratioB);
    },
    unit: "",
    explanationTemplate: "【考え方】\n比で分ける問題は「比の合計」で割って「各部分の比」をかけます。\n\n【解法】\n① 比の合計:\n  A:B = {{ratioA}}:{{ratioB}}\n  合計 = {{ratioA}} + {{ratioB}} = {{ratioSum}}\n\n② Aの値:\n  A = {{total}} × {{ratioA}} / {{ratioSum}} = {{answer}}\n\n【ポイント】\n・比で分ける = 全体 × (自分の比 / 比の合計)\n・A:B = 2:3 なら Aは全体の 2/5\n・比の各要素は「全体に対する割合」と考えてもよい",
    timeLimitSec: 90,
    validate: function(v) {
      return v.ratioA !== v.ratioB && Number.isInteger(v.total * v.ratioA / (v.ratioA + v.ratioB));
    }
  });

  QUESTION_TEMPLATES.push({
    id: "wariai_increase_01",
    category: "割合・比",
    categoryId: 8,
    difficulty: 1,
    templateText: "ある工場の先月の生産量は{{original}}個だった。今月は先月より{{percent}}%増加した。今月の生産量は何個か。",
    variables: {
      original: { type: "int", min: 200, max: 2000, step: 100 },
      percent: { type: "choice", options: [5, 10, 15, 20, 25, 30] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.original * (1 + v.percent / 100);
    },
    unit: "個",
    explanationTemplate: "【考え方】\n「○%増加」= もとの値 × (1 + ○/100)。\n(1 + 増加率)が倍率になります。\n\n【解法】\n① 倍率を計算:\n  1 + {{percent}}/100 = {{multiplier}}\n\n② 今月の生産量:\n  {{original}} × {{multiplier}} = {{answer}}個\n\n【ポイント】\n・○%増加 → ×(1+○/100)、○%減少 → ×(1-○/100)\n・20%増 = 1.2倍、30%減 = 0.7倍\n・「○%の」と「○%増」は違う（30%の=×0.3、30%増=×1.3）",
    timeLimitSec: 60,
    validate: function(v) {
      return Number.isInteger(v.original * (1 + v.percent / 100));
    }
  });

  // 割合: 連続増減
  QUESTION_TEMPLATES.push({
    id: "wariai_consecutive_01",
    category: "割合・比",
    categoryId: 8,
    difficulty: 3,
    templateText: "ある商品の価格が最初{{percent1}}%値上がりし、その後{{percent2}}%値下がりした。最終的な価格は元の価格の何%か。",
    variables: {
      percent1: { type: "choice", options: [10, 20, 25, 30, 50] },
      percent2: { type: "choice", options: [10, 20, 25, 30, 50] }
    },
    answerType: "number",
    answerFormula: function(v) {
      return Math.round((1 + v.percent1/100) * (1 - v.percent2/100) * 100);
    },
    unit: "%",
    explanationTemplate: "【考え方】\n連続増減の問題。増減率を「倍率」に変換して順にかけます。\n同じ率で上がって下がっても元に戻らないことに注意！\n\n【解法】\n① 元の価格を100とする\n\n② {{percent1}}%値上がり後:\n  100 × (1 + {{percent1}}/100) = {{after1}}\n\n③ さらに{{percent2}}%値下がり後:\n  {{after1}} × (1 - {{percent2}}/100) = {{answer}}%\n\n【ポイント】\n・連続変化 = 倍率のかけ算: (1+a/100) × (1-b/100)\n・20%UP → 20%DOWN = 100 × 1.2 × 0.8 = 96（元に戻らない!）\n・「同率の増減は損する」のがポイント（SPI定番のひっかけ）",
    timeLimitSec: 90,
    validate: function(v) {
      var result = (1 + v.percent1/100) * (1 - v.percent2/100) * 100;
      return Math.abs(result - Math.round(result)) < 0.01;
    }
  });

  // 割合: 3つの比
  QUESTION_TEMPLATES.push({
    id: "wariai_ratio3_01",
    category: "割合・比",
    categoryId: 8,
    difficulty: 2,
    templateText: "A, B, C の3人でお金を分ける。A:B = {{ab1}}:{{ab2}}、B:C = {{bc1}}:{{bc2}} のとき、合計{{total}}円をこの比で分けると、Bの取り分はいくらか。",
    variables: {
      ab1: { type: "int", min: 1, max: 5, step: 1 },
      ab2: { type: "int", min: 1, max: 5, step: 1 },
      bc1: { type: "int", min: 1, max: 5, step: 1 },
      bc2: { type: "int", min: 1, max: 5, step: 1 },
      total: { type: "custom" }
    },
    answerType: "number",
    answerFormula: function(v) {
      // A:B = ab1:ab2, B:C = bc1:bc2
      // Bを揃える: A:B:C = ab1*bc1 : ab2*bc1 : ab2*bc2
      var a = v.ab1 * v.bc1;
      var b = v.ab2 * v.bc1;
      var c = v.ab2 * v.bc2;
      return Math.round(v.total * b / (a + b + c));
    },
    unit: "円",
    explanationTemplate: "【考え方】\n2つの比を「連比」にまとめる問題。\n共通の項（ここではB）の値を揃えます。\n\n【解法】\n① 2つの比を確認:\n  A:B = {{ab1}}:{{ab2}}\n  B:C = {{bc1}}:{{bc2}}\n\n② Bの値を揃える（最小公倍数に）:\n  A:B:C = {{a}}:{{b}}:{{c}}\n\n③ Bの取り分:\n  {{total}} × {{b}} / ({{a}}+{{b}}+{{c}}) = {{answer}}円\n\n【ポイント】\n・連比のコツ: 共通の文字（B）を最小公倍数に揃える\n・A:B=2:3、B:C=3:4 → B=3で揃う → A:B:C=2:3:4\n・A:B=2:3、B:C=2:5 → B=6に揃える → A:B:C=4:6:15",
    timeLimitSec: 120,
    validate: function(v) {
      var a = v.ab1 * v.bc1;
      var b = v.ab2 * v.bc1;
      var c = v.ab2 * v.bc2;
      return Number.isInteger(v.total * b / (a + b + c));
    }
  });

  // 割合: 人口増減
  QUESTION_TEMPLATES.push({
    id: "wariai_population_01",
    category: "割合・比",
    categoryId: 8,
    difficulty: 3,
    templateText: "ある市の人口は去年{{population}}人だった。今年は男性が{{maleChange}}%増加し、女性が{{femaleChange}}%減少した。去年の男女比が{{maleRatio}}:{{femaleRatio}}のとき、今年の人口は何人か。",
    variables: {
      population: { type: "int", min: 10000, max: 50000, step: 5000 },
      maleChange: { type: "choice", options: [5, 8, 10] },
      femaleChange: { type: "choice", options: [3, 5, 8] },
      maleRatio: { type: "int", min: 1, max: 3, step: 1 },
      femaleRatio: { type: "int", min: 1, max: 3, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      var totalRatio = v.maleRatio + v.femaleRatio;
      var male = v.population * v.maleRatio / totalRatio;
      var female = v.population - male;
      var newMale = Math.round(male * (1 + v.maleChange/100));
      var newFemale = Math.round(female * (1 - v.femaleChange/100));
      return newMale + newFemale;
    },
    unit: "人",
    explanationTemplate: "【考え方】\n「比で分けてから増減率をかける」複合問題。\n①比から人数を求める → ②各群に増減率を適用 → ③合計\n\n【解法】\n① 去年の男女の人数（比で分ける）:\n  男性: {{population}} × {{maleRatio}}/{{totalRatio}} = {{male}}人\n  女性: {{population}} × {{femaleRatio}}/{{totalRatio}} = {{female}}人\n\n② 今年の人数（増減率を適用）:\n  男性: {{male}} × (1+{{maleChange}}/100) = {{newMale}}人\n  女性: {{female}} × (1-{{femaleChange}}/100) = {{newFemale}}人\n\n③ 今年の人口:\n  {{newMale}} + {{newFemale}} = {{answer}}人\n\n【ポイント】\n・比 → 実数に変換してから増減を計算する\n・男女で増減率が違う → 全体の増減率は単純平均にならない\n・人口問題はSPIで頻出（比+割合の複合問題）",
    timeLimitSec: 150,
    validate: function(v) {
      var totalRatio = v.maleRatio + v.femaleRatio;
      var male = v.population * v.maleRatio / totalRatio;
      var female = v.population - male;
      return Number.isInteger(male) && Number.isInteger(male * (1 + v.maleChange/100)) && Number.isInteger(female * (1 - v.femaleChange/100));
    }
  });
})();

// ============================================================
// カテゴリ9: 図表の読み取り・資料解釈
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "table_sales_01",
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "table",
    tableGenerator: function() {
      var departments = ["営業部", "開発部", "総務部", "企画部"];
      var quarters = ["第1四半期", "第2四半期", "第3四半期", "第4四半期"];
      var data = {};
      departments.forEach(function(dept) {
        data[dept] = {};
        quarters.forEach(function(q) {
          data[dept][q] = (Math.floor(Math.random() * 40) + 10) * 10;
        });
      });
      return { rows: departments, cols: quarters, data: data, unit: "万円" };
    },
    questionGenerator: function(tableData) {
      var dept = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var total = 0;
      tableData.cols.forEach(function(q) {
        total += tableData.data[dept][q];
      });
      return {
        text: "次の表は各部門の四半期ごとの売上を示している。\n\n" + formatTable(tableData) + "\n\n" + dept + "の年間売上の合計はいくらか。",
        answer: total,
        unit: "万円",
        explanation: dept + "の各四半期の売上:\n" + tableData.cols.map(function(q) {
          return q + ": " + tableData.data[dept][q] + "万円";
        }).join("\n") + "\n\n合計 = " + total + "万円"
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "table_sales_02",
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function() {
      var products = ["商品A", "商品B", "商品C", "商品D"];
      var years = ["2022年", "2023年", "2024年"];
      var data = {};
      products.forEach(function(p) {
        data[p] = {};
        var base = (Math.floor(Math.random() * 30) + 10) * 100;
        years.forEach(function(y, i) {
          data[p][y] = base + (Math.floor(Math.random() * 20) - 5) * 100 * (i + 1);
          if (data[p][y] < 500) data[p][y] = 500;
        });
      });
      return { rows: products, cols: years, data: data, unit: "個" };
    },
    questionGenerator: function(tableData) {
      var product = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var cols = tableData.cols;
      var val1 = tableData.data[product][cols[0]];
      var val2 = tableData.data[product][cols[cols.length - 1]];
      var changeRate = Math.round((val2 - val1) / val1 * 100);
      return {
        text: "次の表は各商品の年間販売数を示している。\n\n" + formatTable(tableData) + "\n\n" + product + "の" + cols[0] + "から" + cols[cols.length-1] + "への増減率は何%か。（小数点以下を四捨五入）",
        answer: changeRate,
        unit: "%",
        explanation: product + "の販売数:\n" + cols[0] + ": " + val1 + "個\n" + cols[cols.length-1] + ": " + val2 + "個\n\n増減率 = (" + val2 + " - " + val1 + ") / " + val1 + " × 100 = " + changeRate + "%"
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  QUESTION_TEMPLATES.push({
    id: "table_composition_01",
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function() {
      var categories = ["食費", "住居費", "交通費", "教育費", "その他"];
      var data = {};
      var remaining = 100;
      categories.forEach(function(cat, i) {
        if (i === categories.length - 1) {
          data[cat] = remaining;
        } else {
          var val = Math.floor(Math.random() * 15) + 10;
          if (val > remaining - (categories.length - 1 - i) * 5) {
            val = Math.max(5, remaining - (categories.length - 1 - i) * 10);
          }
          data[cat] = val;
          remaining -= val;
        }
      });
      var totalAmount = (Math.floor(Math.random() * 20) + 20) * 10000;
      return { categories: categories, percentages: data, totalAmount: totalAmount };
    },
    questionGenerator: function(tableData) {
      var cat = tableData.categories[Math.floor(Math.random() * (tableData.categories.length - 1))];
      var pct = tableData.percentages[cat];
      var amount = Math.round(tableData.totalAmount * pct / 100);
      var tableStr = "【月間支出の内訳】 総額: " + tableData.totalAmount.toLocaleString() + "円\n\n";
      tableData.categories.forEach(function(c) {
        tableStr += c + ": " + tableData.percentages[c] + "%\n";
      });
      return {
        text: tableStr + "\n" + cat + "の金額はいくらか。",
        answer: amount,
        unit: "円",
        explanation: cat + "の割合: " + pct + "%\n\n金額 = " + tableData.totalAmount.toLocaleString() + " × " + pct + "/100 = " + amount.toLocaleString() + "円"
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "table_max_01",
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "table",
    tableGenerator: function() {
      var cities = ["東京", "大阪", "名古屋", "福岡", "札幌"];
      var months = ["1月", "4月", "7月", "10月"];
      var data = {};
      cities.forEach(function(city) {
        data[city] = {};
        months.forEach(function(m, i) {
          var base = [5, 15, 30, 18][i];
          data[city][m] = base + Math.floor(Math.random() * 8) - 3;
        });
      });
      return { rows: cities, cols: months, data: data, unit: "℃" };
    },
    questionGenerator: function(tableData) {
      var month = tableData.cols[Math.floor(Math.random() * tableData.cols.length)];
      var maxCity = "";
      var maxVal = -100;
      tableData.rows.forEach(function(city) {
        if (tableData.data[city][month] > maxVal) {
          maxVal = tableData.data[city][month];
          maxCity = city;
        }
      });
      var choices = tableData.rows.slice();
      return {
        text: "次の表は各都市の月別平均気温を示している。\n\n" + formatTable(tableData) + "\n\n" + month + "の平均気温が最も高い都市はどこか。",
        answer: maxCity,
        choices: choices,
        explanation: month + "の各都市の気温:\n" + tableData.rows.map(function(city) {
          return city + ": " + tableData.data[city][month] + "℃";
        }).join("\n") + "\n\n最も高いのは" + maxCity + "の" + maxVal + "℃です。"
      };
    },
    answerType: "choice",
    timeLimitSec: 90
  });

  QUESTION_TEMPLATES.push({
    id: "table_diff_01",
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "table",
    tableGenerator: function() {
      var stores = ["A店", "B店", "C店", "D店"];
      var months = ["4月", "5月", "6月", "7月", "8月"];
      var data = {};
      stores.forEach(function(store) {
        data[store] = {};
        var base = (Math.floor(Math.random() * 30) + 20) * 10;
        months.forEach(function(m, i) {
          data[store][m] = base + (Math.floor(Math.random() * 10) - 3) * 10;
          if (data[store][m] < 100) data[store][m] = 100;
        });
      });
      return { rows: stores, cols: months, data: data, unit: "万円" };
    },
    questionGenerator: function(tableData) {
      var store = tableData.rows[Math.floor(Math.random() * tableData.rows.length)];
      var cols = tableData.cols;
      var maxDiff = 0;
      var maxMonth = "";
      for (var i = 1; i < cols.length; i++) {
        var diff = tableData.data[store][cols[i]] - tableData.data[store][cols[i-1]];
        if (Math.abs(diff) > Math.abs(maxDiff)) {
          maxDiff = diff;
          maxMonth = cols[i-1] + "→" + cols[i];
        }
      }
      return {
        text: "次の表は各店舗の月別売上を示している。\n\n" + formatTable(tableData) + "\n\n" + store + "で前月比の売上変動額（絶対値）が最も大きかった変動の変動額はいくらか。（増加はプラス、減少はマイナスで答えよ）",
        answer: maxDiff,
        unit: "万円",
        explanation: store + "の月別売上変動:\n" + (function() {
          var lines = [];
          for (var i = 1; i < cols.length; i++) {
            var d = tableData.data[store][cols[i]] - tableData.data[store][cols[i-1]];
            lines.push(cols[i-1] + "→" + cols[i] + ": " + (d >= 0 ? "+" : "") + d + "万円");
          }
          return lines.join("\n");
        })() + "\n\n最大変動: " + maxMonth + " で " + (maxDiff >= 0 ? "+" : "") + maxDiff + "万円"
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  // --- グラフ問題 ---

  // chart_bar_01: 棒グラフ（単一系列）- 合計/差額
  QUESTION_TEMPLATES.push({
    id: "chart_bar_01",
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "chart",
    chartGenerator: function() {
      var deptNames = [
        ["営業部", "開発部", "総務部", "企画部", "人事部"],
        ["東京支店", "大阪支店", "名古屋支店", "福岡支店", "札幌支店"],
        ["A事業部", "B事業部", "C事業部", "D事業部"]
      ];
      var labels = deptNames[Math.floor(Math.random() * deptNames.length)];
      var data = labels.map(function() {
        return (Math.floor(Math.random() * 40) + 10) * 10;
      });
      return {
        chartType: "bar",
        title: "部門別売上高（2024年度）",
        labels: labels,
        datasets: [{ label: "売上高", data: data, color: "#4285f4" }],
        unit: "万円",
        yAxisLabel: "売上高（万円）"
      };
    },
    questionGenerator: function(chartData) {
      var data = chartData.datasets[0].data;
      var labels = chartData.labels;
      var maxVal = Math.max.apply(null, data);
      var minVal = Math.min.apply(null, data);
      var diff = maxVal - minVal;
      var maxLabel = labels[data.indexOf(maxVal)];
      var minLabel = labels[data.indexOf(minVal)];

      return {
        text: "次のグラフは各部門の年間売上高を示している。\n\n売上が最も高い部門と最も低い部門の差額はいくらか。",
        answer: diff,
        unit: "万円",
        explanation: "【考え方】\n棒グラフから最大値と最小値を読み取り、差を求めます。\n\n【解法】\n① 最大: " + maxLabel + " = " + maxVal + "万円\n② 最小: " + minLabel + " = " + minVal + "万円\n③ 差額 = " + maxVal + " - " + minVal + " = " + diff + "万円\n\n【ポイント】\n・棒グラフでは棒の高さで数値を比較\n・差額 = 最大値 − 最小値",
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  // chart_bar_compare_01: 棒グラフ（2系列比較）- 前年比増加額
  QUESTION_TEMPLATES.push({
    id: "chart_bar_compare_01",
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "chart",
    chartGenerator: function() {
      var labels = ["商品A", "商品B", "商品C", "商品D"];
      var prevData = labels.map(function() {
        return (Math.floor(Math.random() * 30) + 15) * 10;
      });
      var currData = prevData.map(function(v) {
        var change = Math.floor(Math.random() * 15) - 3;
        return Math.max(50, v + change * 10);
      });
      // 少なくとも1つは増加を保証
      var hasIncrease = currData.some(function(v, i) { return v > prevData[i]; });
      if (!hasIncrease) {
        var ri = Math.floor(Math.random() * currData.length);
        currData[ri] = prevData[ri] + (Math.floor(Math.random() * 5) + 1) * 10;
      }
      return {
        chartType: "bar",
        title: "商品別売上高の推移",
        labels: labels,
        datasets: [
          { label: "前年", data: prevData, color: "#90caf9" },
          { label: "今年", data: currData, color: "#1565c0" }
        ],
        unit: "万円",
        yAxisLabel: "売上高（万円）"
      };
    },
    questionGenerator: function(chartData) {
      var labels = chartData.labels;
      var prevData = chartData.datasets[0].data;
      var currData = chartData.datasets[1].data;

      // 増加額が最大の商品を特定
      var maxIncrease = -Infinity;
      var maxIdx = 0;
      labels.forEach(function(_, i) {
        var inc = currData[i] - prevData[i];
        if (inc > maxIncrease) {
          maxIncrease = inc;
          maxIdx = i;
        }
      });

      var details = labels.map(function(label, i) {
        var diff = currData[i] - prevData[i];
        return label + ": " + prevData[i] + " → " + currData[i] + "（" + (diff >= 0 ? "+" : "") + diff + "万円）";
      }).join("\n");

      return {
        text: "次のグラフは各商品の前年と今年の売上高を示している。\n\n前年からの売上増加額が最も大きい商品の増加額はいくらか。",
        answer: maxIncrease,
        unit: "万円",
        explanation: "【考え方】\n各商品の「今年 − 前年」を計算し、最大の増加額を求めます。\n\n【解法】\n各商品の増加額:\n" + details + "\n\n最大の増加額: " + labels[maxIdx] + " の +" + maxIncrease + "万円\n\n【ポイント】\n・2系列の棒グラフでは同じカテゴリの棒を比較\n・増加額 = 今年の値 − 前年の値",
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  // chart_line_01: 折れ線グラフ - 最大変動期間
  QUESTION_TEMPLATES.push({
    id: "chart_line_01",
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 2,
    type: "chart",
    chartGenerator: function() {
      var labels = ["4月", "5月", "6月", "7月", "8月", "9月"];
      var base = (Math.floor(Math.random() * 20) + 20) * 10;
      var data = [base];
      for (var i = 1; i < labels.length; i++) {
        var change = (Math.floor(Math.random() * 10) - 4) * 10;
        data.push(Math.max(50, data[i - 1] + change));
      }
      return {
        chartType: "line",
        title: "月別売上高の推移",
        labels: labels,
        datasets: [{ label: "売上高", data: data, color: "#4285f4" }],
        unit: "万円",
        yAxisLabel: "売上高（万円）"
      };
    },
    questionGenerator: function(chartData) {
      var data = chartData.datasets[0].data;
      var labels = chartData.labels;

      var maxDiff = 0;
      var maxMonth = "";
      var maxDiffVal = 0;
      for (var i = 1; i < data.length; i++) {
        var diff = data[i] - data[i - 1];
        if (Math.abs(diff) > Math.abs(maxDiff)) {
          maxDiff = diff;
          maxMonth = labels[i - 1] + "→" + labels[i];
          maxDiffVal = diff;
        }
      }

      var details = [];
      for (var j = 1; j < data.length; j++) {
        var d = data[j] - data[j - 1];
        details.push(labels[j - 1] + "→" + labels[j] + ": " + (d >= 0 ? "+" : "") + d + "万円");
      }

      return {
        text: "次のグラフはある店舗の月別売上高の推移を示している。\n\n前月比の売上変動額（絶対値）が最も大きい期間の変動額はいくらか。（増加はプラス、減少はマイナスで答えよ）",
        answer: maxDiffVal,
        unit: "万円",
        explanation: "【考え方】\n折れ線グラフの各月間の変動額を計算し、絶対値が最大のものを求めます。\n\n【解法】\n各月間の変動額:\n" + details.join("\n") + "\n\n絶対値が最大: " + maxMonth + " の " + (maxDiffVal >= 0 ? "+" : "") + maxDiffVal + "万円\n\n【ポイント】\n・折れ線の傾きが急なほど変動が大きい\n・増減の方向（プラス/マイナス）に注意",
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 150
  });

  // chart_pie_01: 円グラフ - 構成比から実数算出
  QUESTION_TEMPLATES.push({
    id: "chart_pie_01",
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 1,
    type: "chart",
    chartGenerator: function() {
      var categories = ["食費", "住居費", "交通費", "教育費", "その他"];
      var pcts = [];
      var remaining = 100;
      for (var i = 0; i < categories.length; i++) {
        if (i === categories.length - 1) {
          pcts.push(remaining);
        } else {
          var val = Math.floor(Math.random() * 12) + 12;
          if (val > remaining - (categories.length - 1 - i) * 8) {
            val = Math.max(8, remaining - (categories.length - 1 - i) * 12);
          }
          pcts.push(val);
          remaining -= val;
        }
      }
      var totalAmount = (Math.floor(Math.random() * 15) + 25) * 10000;
      return {
        chartType: "pie",
        title: "月間支出の内訳（総額: " + totalAmount.toLocaleString() + "円）",
        labels: categories,
        datasets: [{ label: "支出", data: pcts }],
        unit: "%",
        totalAmount: totalAmount
      };
    },
    questionGenerator: function(chartData) {
      var categories = chartData.labels;
      var pcts = chartData.datasets[0].data;
      var totalAmount = chartData.totalAmount;

      var idx = Math.floor(Math.random() * (categories.length - 1));
      var cat = categories[idx];
      var pct = pcts[idx];
      var amount = Math.round(totalAmount * pct / 100);

      return {
        text: "次の円グラフは月間支出（総額 " + totalAmount.toLocaleString() + "円）の内訳を示している。\n\n" + cat + "の金額はいくらか。",
        answer: amount,
        unit: "円",
        explanation: "【考え方】\n円グラフから割合を読み取り、総額に掛けて金額を求めます。\n\n【解法】\n① " + cat + "の割合: " + pct + "%\n② 金額 = " + totalAmount.toLocaleString() + " × " + pct + " / 100\n  = " + amount.toLocaleString() + "円\n\n【ポイント】\n・円グラフの各部分は全体に対する割合を表す\n・金額 = 総額 × 割合(%) / 100",
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 120
  });

  // chart_pie_compare_01: 2つの円グラフ比較
  QUESTION_TEMPLATES.push({
    id: "chart_pie_compare_01",
    category: "図表の読み取り",
    categoryId: 9,
    difficulty: 3,
    type: "chart",
    chartGenerator: function() {
      var categories = ["人件費", "材料費", "広告費", "その他"];
      var totals = [
        (Math.floor(Math.random() * 10) + 30) * 100,
        (Math.floor(Math.random() * 10) + 25) * 100
      ];
      var deptNames = [["A部門", "B部門"], ["東日本", "西日本"], ["上半期", "下半期"]];
      var names = deptNames[Math.floor(Math.random() * deptNames.length)];
      var datasets = names.map(function(name, di) {
        var pcts = [];
        var remaining = 100;
        for (var i = 0; i < categories.length; i++) {
          if (i === categories.length - 1) {
            pcts.push(remaining);
          } else {
            var val = Math.floor(Math.random() * 15) + 15;
            if (val > remaining - (categories.length - 1 - i) * 10) {
              val = Math.max(10, remaining - (categories.length - 1 - i) * 15);
            }
            pcts.push(val);
            remaining -= val;
          }
        }
        return { label: name, data: pcts, total: totals[di] };
      });
      return {
        chartType: "pie",
        title: "部門別経費の内訳",
        labels: categories,
        datasets: datasets,
        unit: "万円"
      };
    },
    questionGenerator: function(chartData) {
      var categories = chartData.labels;
      var ds0 = chartData.datasets[0];
      var ds1 = chartData.datasets[1];

      var idx = Math.floor(Math.random() * (categories.length - 1));
      var cat = categories[idx];

      var amount0 = Math.round(ds0.total * ds0.data[idx] / 100);
      var amount1 = Math.round(ds1.total * ds1.data[idx] / 100);
      var diff = Math.abs(amount0 - amount1);

      var larger = amount0 > amount1 ? ds0.label : ds1.label;

      return {
        text: "次の2つの円グラフは" + ds0.label + "（計 " + ds0.total.toLocaleString() + "万円）と" + ds1.label + "（計 " + ds1.total.toLocaleString() + "万円）の経費内訳を示している。\n\n" + cat + "の金額の差はいくらか。",
        answer: diff,
        unit: "万円",
        explanation: "【考え方】\n各円グラフの割合からそれぞれの金額を算出し、差を求めます。\n\n【解法】\n① " + ds0.label + "の" + cat + ": " + ds0.total.toLocaleString() + " × " + ds0.data[idx] + "% = " + amount0 + "万円\n② " + ds1.label + "の" + cat + ": " + ds1.total.toLocaleString() + " × " + ds1.data[idx] + "% = " + amount1 + "万円\n③ 差額 = |" + amount0 + " - " + amount1 + "| = " + diff + "万円\n  （" + larger + "の方が大きい）\n\n【ポイント】\n・2つの円グラフの比較は割合ではなく金額で比較\n・総額が異なるため、同じ割合でも金額は異なる",
        chartConfig: chartData
      };
    },
    answerType: "number",
    timeLimitSec: 180
  });

})();

// ============================================================
// カテゴリ10: 順列・組み合わせ
// ============================================================
(function() {
  QUESTION_TEMPLATES.push({
    id: "junretsu_basic_01",
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 1,
    templateText: "{{n}}人の中から{{r}}人を選んで一列に並べる方法は何通りあるか。",
    variables: {
      n: { type: "int", min: 4, max: 8, step: 1 },
      r: { type: "int", min: 2, max: 4, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return permutation(v.n, v.r);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「選んで並べる」→ 順列(P)を使います。\n順番が区別される（1番目と2番目が違う）場合は順列。\n\n【解法】\n① 順列の公式: P(n, r) = n! / (n-r)!\n  = n × (n-1) × ... × (n-r+1)\n\n② P({{n}}, {{r}}) = {{calculation}} = {{answer}}通り\n\n【ポイント】\n・順列(P): 順番を区別する → 並べ方の数\n・組み合わせ(C): 順番を区別しない → 選び方の数\n・P(n,r) = C(n,r) × r!（並べ方 = 選び方 × 並べる順番）",
    timeLimitSec: 90,
    validate: function(v) {
      return v.r <= v.n;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "kumiawase_basic_01",
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 1,
    templateText: "{{n}}人の中から{{r}}人を選ぶ方法は何通りあるか。",
    variables: {
      n: { type: "int", min: 5, max: 10, step: 1 },
      r: { type: "int", min: 2, max: 4, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return combination(v.n, v.r);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「選ぶだけ（順番なし）」→ 組み合わせ(C)を使います。\n「委員を選ぶ」「チームを作る」などは組み合わせ。\n\n【解法】\n① 組み合わせの公式: C(n, r) = n! / (r! × (n-r)!)\n\n② C({{n}}, {{r}}) = {{calculation}} = {{answer}}通り\n\n【ポイント】\n・C(n,r) = P(n,r) / r!（順列を「順番の重複」で割る）\n・C(n,r) = C(n, n-r) の性質あり（例: C(7,5) = C(7,2)）\n・計算のコツ: 小さい方のrを使うと計算が楽",
    timeLimitSec: 90,
    validate: function(v) {
      return v.r <= v.n;
    }
  });

  QUESTION_TEMPLATES.push({
    id: "junretsu_cond_01",
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{n}}人を一列に並べるとき、特定の2人が隣り合う並べ方は何通りあるか。",
    variables: {
      n: { type: "int", min: 4, max: 7, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return factorial(v.n - 1) * 2;
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「隣り合う」条件付き順列。隣り合う人たちを1つのブロックとみなして\nまとめて並べ、ブロック内の並び順を掛けます。\n\n【解法】\n① 特定の2人を1つのブロック（かたまり）として扱う\n  → {{n}}人 → ブロック+残り = {{nMinus1}}組\n\n② {{nMinus1}}組の並べ方:\n  {{nMinus1}}! = {{blockPerm}}通り\n\n③ ブロック内の2人の並び順:\n  AB or BA = 2通り\n\n④ 合計: {{blockPerm}} × 2 = {{answer}}通り\n\n【ポイント】\n・「隣り合う」→ まとめて1ブロック → (n-1)! × (ブロック内の並び)\n・「隣り合わない」→ 全体 - 隣り合う で求めるのが楽\n・3人が隣り合う場合は (n-2)! × 3! になる",
    timeLimitSec: 120
  });

  QUESTION_TEMPLATES.push({
    id: "kumiawase_cond_01",
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "男子{{boys}}人と女子{{girls}}人の中から、男子{{selectBoys}}人と女子{{selectGirls}}人を選ぶ方法は何通りあるか。",
    variables: {
      boys: { type: "int", min: 3, max: 6, step: 1 },
      girls: { type: "int", min: 3, max: 6, step: 1 },
      selectBoys: { type: "int", min: 1, max: 3, step: 1 },
      selectGirls: { type: "int", min: 1, max: 3, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return combination(v.boys, v.selectBoys) * combination(v.girls, v.selectGirls);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n条件ごとに独立して選ぶ場合は「積の法則」を使います。\n男子の選び方 × 女子の選び方 = 全体の選び方。\n\n【解法】\n① 男子の選び方:\n  C({{boys}}, {{selectBoys}}) = {{boysComb}}通り\n\n② 女子の選び方:\n  C({{girls}}, {{selectGirls}}) = {{girlsComb}}通り\n\n③ 積の法則（独立なので掛け算）:\n  {{boysComb}} × {{girlsComb}} = {{answer}}通り\n\n【ポイント】\n・独立した選択 → かけ算（積の法則）\n・同時に起こる選択 → かけ算、どちらか → 足し算（和の法則）\n・「男子○人と女子△人」→ 別々に選んでかけ算",
    timeLimitSec: 120,
    validate: function(v) {
      return v.selectBoys <= v.boys && v.selectGirls <= v.girls;
    }
  });

  // 順列: 円順列
  QUESTION_TEMPLATES.push({
    id: "junretsu_circle_01",
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{n}}人が円形のテーブルに座る方法は何通りあるか。",
    variables: {
      n: { type: "int", min: 4, max: 7, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return factorial(v.n - 1);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n円形に並べる「円順列」は、回転を同一視するため1人を固定します。\n直線の順列(n!)から回転分(n通り)を割ります。\n\n【解法】\n① 円順列の公式: (n-1)!\n  1人を固定し、残り(n-1)人の並べ方を数える\n\n② ({{n}}-1)! = {{nMinus1}}! = {{answer}}通り\n\n【ポイント】\n・直線の順列: n!、円順列: (n-1)!\n・なぜ(n-1)!か: 回転して同じ並びはn通りあるので n!/n = (n-1)!\n・さらに裏返しも同じとする場合: (n-1)!/2（じゅず順列）",
    timeLimitSec: 90
  });

  // 組合せ: 委員の選び方
  QUESTION_TEMPLATES.push({
    id: "kumiawase_committee_01",
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{n}}人の中から委員長1人、副委員長1人、書記1人を選ぶ方法は何通りあるか。",
    variables: {
      n: { type: "int", min: 5, max: 10, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return v.n * (v.n - 1) * (v.n - 2);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n役職（委員長・副委員長・書記）が異なるので、誰がどの役かが重要。\nこれは「順列」の問題です（選んで割り当てる）。\n\n【解法】\n① 委員長の選び方: {{n}}通り\n② 副委員長の選び方: {{nM1}}通り（委員長以外）\n③ 書記の選び方: {{nM2}}通り（委員長・副委員長以外）\n\n④ 合計: {{n}} × {{nM1}} × {{nM2}} = {{answer}}通り\n  = P({{n}}, 3)\n\n【ポイント】\n・役職あり → 順列（誰がどの役かで区別）\n・役職なし（3人選ぶだけ）→ 組み合わせ C(n,3)\n・P(n,3) = C(n,3) × 3!（3つの役の並べ方6通り分の差）",
    timeLimitSec: 90
  });

  // 組合せ: 最短経路
  QUESTION_TEMPLATES.push({
    id: "kumiawase_path_01",
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 3,
    templateText: "右に{{right}}回、上に{{up}}回進んで目的地に着く最短経路は何通りあるか。",
    variables: {
      right: { type: "int", min: 2, max: 5, step: 1 },
      up: { type: "int", min: 2, max: 4, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return combination(v.right + v.up, v.up);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n最短経路問題は「右(→)と上(↑)の移動順序」の組み合わせ。\n全移動回数の中から「上に進む回」を選ぶ問題に帰着します。\n\n【解法】\n① 全移動回数:\n  右{{right}}回 + 上{{up}}回 = {{total}}回\n\n② この{{total}}回の中から「上に進む{{up}}回」を選ぶ:\n  C({{total}}, {{up}}) = {{answer}}通り\n\n【ポイント】\n・最短経路 = 同じものを含む順列 = 組み合わせ\n・C(右+上, 上) = C(右+上, 右) どちらで計算してもOK\n・途中に通過点がある場合: 「出発→通過点」×「通過点→目的地」\n・通れない交差点がある場合: 全体 - 通れない経路 で求める",
    timeLimitSec: 120
  });

  // 順列: 特定の人を除外
  QUESTION_TEMPLATES.push({
    id: "junretsu_exclude_01",
    category: "順列・組み合わせ",
    categoryId: 10,
    difficulty: 2,
    templateText: "{{n}}人を一列に並べるとき、特定の1人が先頭にならない並べ方は何通りあるか。",
    variables: {
      n: { type: "int", min: 4, max: 7, step: 1 }
    },
    answerType: "number",
    answerFormula: function(v) {
      return factorial(v.n) - factorial(v.n - 1);
    },
    unit: "通り",
    explanationTemplate: "【考え方】\n「○○にならない場合の数」= 全体 - ○○になる場合の数。\n余事象の考え方を使います。\n\n【解法】\n① 全体の並べ方（制約なし）:\n  {{n}}! = {{allPerm}}通り\n\n② 特定の人が先頭になる場合:\n  先頭を固定 → 残り({{n}}-1)人の並べ方: ({{n}}-1)! = {{headPerm}}通り\n\n③ 先頭にならない場合（余事象）:\n  {{allPerm}} - {{headPerm}} = {{answer}}通り\n\n【ポイント】\n・「○○でない」→ 全体 - ○○ の余事象が楽\n・別解: 先頭は(n-1)通り × 残りは(n-1)! = (n-1)×(n-1)! でも同じ\n・余事象は確率・場合の数どちらでも超重要テクニック",
    timeLimitSec: 90
  });
})();


// ============================================================
// ヘルパー関数（グローバル）
// ============================================================
function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) { var t = b; b = a % b; a = t; }
  return a;
}

function factorial(n) {
  if (n <= 1) return 1;
  var result = 1;
  for (var i = 2; i <= n; i++) result *= i;
  return result;
}

function permutation(n, r) {
  var result = 1;
  for (var i = 0; i < r; i++) result *= (n - i);
  return result;
}

function combination(n, r) {
  if (r > n) return 0;
  if (r === 0 || r === n) return 1;
  if (r > n - r) r = n - r;
  var result = 1;
  for (var i = 0; i < r; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

function formatTable(tableData) {
  var cols = tableData.cols;
  var rows = tableData.rows;
  var data = tableData.data;
  var unit = tableData.unit || "";

  // ヘッダー行
  var header = "| |" + cols.map(function(c) { return " " + c + " |"; }).join("");
  var separator = "|---|" + cols.map(function() { return "---:|"; }).join("");

  // データ行
  var dataRows = rows.map(function(row) {
    return "| " + row + " |" + cols.map(function(col) {
      return " " + data[row][col] + " |";
    }).join("");
  });

  return header + "\n" + separator + "\n" + dataRows.join("\n") + "\n（単位: " + unit + "）";
}

// ============================================================
// グラフ描画関数（Canvas API）
// ============================================================

var CHART_COLORS = ["#4285f4", "#ea4335", "#fbbc04", "#34a853", "#ff6d01", "#46bdc6", "#9c27b0", "#795548"];

/**
 * メインルーター: chartTypeに応じて描画関数を分岐
 * @param {HTMLCanvasElement} canvas
 * @param {Object} config - chartType, title, labels, datasets, unit, yAxisLabel等
 */
function drawQuestionChart(canvas, config) {
  var dpr = window.devicePixelRatio || 1;
  var cssW = 560;
  var cssH = 340;

  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";

  var ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  if (config.chartType === "bar") {
    drawBarChart(ctx, cssW, cssH, config);
  } else if (config.chartType === "line") {
    drawLineChart(ctx, cssW, cssH, config);
  } else if (config.chartType === "pie") {
    drawPieChart(ctx, cssW, cssH, config);
  }
}

/**
 * 棒グラフ描画
 */
function drawBarChart(ctx, w, h, config) {
  var labels = config.labels;
  var datasets = config.datasets;
  var title = config.title || "";
  var yAxisLabel = config.yAxisLabel || "";

  // 描画エリア
  var padLeft = 70, padRight = 20, padTop = 40, padBottom = 50;
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  // Y軸の最大値を算出
  var maxVal = 0;
  datasets.forEach(function(ds) {
    ds.data.forEach(function(v) { if (v > maxVal) maxVal = v; });
  });
  var yMax = Math.ceil(maxVal / 100) * 100;
  if (yMax === 0) yMax = 100;
  // 5段階のグリッド
  var yStep = yMax / 5;

  // タイトル
  ctx.font = "bold 14px system-ui";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(title, w / 2, 20);

  // Y軸ラベル
  ctx.font = "11px system-ui";
  ctx.fillStyle = "#666";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (var i = 0; i <= 5; i++) {
    var yVal = yStep * i;
    var yPos = padTop + chartH - (chartH * yVal / yMax);
    ctx.fillText(String(Math.round(yVal)), padLeft - 8, yPos);

    // グリッド線
    ctx.beginPath();
    ctx.moveTo(padLeft, yPos);
    ctx.lineTo(padLeft + chartW, yPos);
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Y軸タイトル
  if (yAxisLabel) {
    ctx.save();
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.translate(14, padTop + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();
  }

  // 棒グラフ描画
  var numGroups = labels.length;
  var numSeries = datasets.length;
  var groupW = chartW / numGroups;
  var barW = Math.min(groupW * 0.7 / numSeries, 50);
  var totalBarW = barW * numSeries;

  labels.forEach(function(label, gi) {
    var groupX = padLeft + groupW * gi + groupW / 2;

    datasets.forEach(function(ds, si) {
      var barX = groupX - totalBarW / 2 + barW * si;
      var barH = (ds.data[gi] / yMax) * chartH;
      var barY = padTop + chartH - barH;

      ctx.fillStyle = ds.color || CHART_COLORS[si % CHART_COLORS.length];
      ctx.fillRect(barX, barY, barW - 2, barH);

      // 数値ラベル
      ctx.font = "10px system-ui";
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(String(ds.data[gi]), barX + (barW - 2) / 2, barY - 3);
    });

    // X軸ラベル
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, groupX, padTop + chartH + 8);
  });

  // 凡例（複数系列の場合のみ）
  if (numSeries > 1) {
    var legendX = padLeft + 10;
    var legendY = padTop + chartH + 30;
    ctx.font = "11px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    datasets.forEach(function(ds, si) {
      var x = legendX + si * 100;
      ctx.fillStyle = ds.color || CHART_COLORS[si % CHART_COLORS.length];
      ctx.fillRect(x, legendY - 5, 12, 10);
      ctx.fillStyle = "#333";
      ctx.fillText(ds.label || "", x + 16, legendY);
    });
  }
}

/**
 * 折れ線グラフ描画
 */
function drawLineChart(ctx, w, h, config) {
  var labels = config.labels;
  var datasets = config.datasets;
  var title = config.title || "";
  var yAxisLabel = config.yAxisLabel || "";

  var padLeft = 70, padRight = 20, padTop = 40, padBottom = 50;
  var chartW = w - padLeft - padRight;
  var chartH = h - padTop - padBottom;

  // Y軸の最大値・最小値
  var maxVal = 0, minVal = Infinity;
  datasets.forEach(function(ds) {
    ds.data.forEach(function(v) {
      if (v > maxVal) maxVal = v;
      if (v < minVal) minVal = v;
    });
  });
  var yMin = Math.floor(minVal / 100) * 100;
  if (yMin > 0) yMin = 0;
  var yMax = Math.ceil(maxVal / 100) * 100;
  if (yMax === yMin) yMax = yMin + 100;
  var yRange = yMax - yMin;
  var yStep = yRange / 5;

  // タイトル
  ctx.font = "bold 14px system-ui";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(title, w / 2, 20);

  // Y軸ラベル・グリッド
  ctx.font = "11px system-ui";
  ctx.fillStyle = "#666";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (var i = 0; i <= 5; i++) {
    var yVal = yMin + yStep * i;
    var yPos = padTop + chartH - (chartH * (yVal - yMin) / yRange);
    ctx.fillText(String(Math.round(yVal)), padLeft - 8, yPos);
    ctx.beginPath();
    ctx.moveTo(padLeft, yPos);
    ctx.lineTo(padLeft + chartW, yPos);
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Y軸タイトル
  if (yAxisLabel) {
    ctx.save();
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.translate(14, padTop + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();
  }

  // X軸ラベル
  var numPoints = labels.length;
  labels.forEach(function(label, i) {
    var x = padLeft + (chartW / (numPoints - 1)) * i;
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, x, padTop + chartH + 8);
  });

  // 折れ線描画
  datasets.forEach(function(ds, si) {
    var color = ds.color || CHART_COLORS[si % CHART_COLORS.length];

    // 線
    ctx.beginPath();
    ds.data.forEach(function(v, i) {
      var x = padLeft + (chartW / (numPoints - 1)) * i;
      var y = padTop + chartH - (chartH * (v - yMin) / yRange);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // マーカー + 数値ラベル
    ds.data.forEach(function(v, i) {
      var x = padLeft + (chartW / (numPoints - 1)) * i;
      var y = padTop + chartH - (chartH * (v - yMin) / yRange);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "10px system-ui";
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(String(v), x, y - 7);
    });
  });

  // 凡例
  if (datasets.length > 1) {
    var legendX = padLeft + 10;
    var legendY = padTop + chartH + 30;
    ctx.font = "11px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    datasets.forEach(function(ds, si) {
      var x = legendX + si * 100;
      ctx.fillStyle = ds.color || CHART_COLORS[si % CHART_COLORS.length];
      ctx.fillRect(x, legendY - 5, 12, 10);
      ctx.fillStyle = "#333";
      ctx.fillText(ds.label || "", x + 16, legendY);
    });
  }
}

/**
 * 円グラフ描画
 */
function drawPieChart(ctx, w, h, config) {
  var title = config.title || "";
  var labels = config.labels;
  var dataset = config.datasets[0];
  var data = dataset.data;

  // 複数円グラフ対応（左右に並べる）
  var numPies = config.datasets.length;
  if (numPies > 1) {
    drawMultiPieChart(ctx, w, h, config);
    return;
  }

  var total = 0;
  data.forEach(function(v) { total += v; });

  // タイトル
  ctx.font = "bold 14px system-ui";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(title, w / 2, 20);

  var cx = w / 2 - 60;
  var cy = h / 2 + 10;
  var radius = Math.min(w, h) * 0.32;

  // 扇形描画
  var startAngle = -Math.PI / 2;
  data.forEach(function(val, i) {
    var sliceAngle = (val / total) * Math.PI * 2;
    var endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // パーセンテージラベル（扇の中央）
    var midAngle = startAngle + sliceAngle / 2;
    var pct = Math.round(val / total * 100);
    if (pct >= 5) {
      var labelR = radius * 0.65;
      var lx = cx + labelR * Math.cos(midAngle);
      var ly = cy + labelR * Math.sin(midAngle);
      ctx.font = "bold 11px system-ui";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pct + "%", lx, ly);
    }

    startAngle = endAngle;
  });

  // 凡例（右側に縦並び）
  var legendX = cx + radius + 40;
  var legendStartY = cy - (labels.length * 22) / 2;
  ctx.font = "11px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  labels.forEach(function(label, i) {
    var ly = legendStartY + i * 22;
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(legendX, ly - 5, 12, 10);
    ctx.fillStyle = "#333";
    var pct = Math.round(data[i] / total * 100);
    ctx.fillText(label + " (" + pct + "%)", legendX + 16, ly);
  });
}

/**
 * 複数円グラフ（左右並べて比較）
 */
function drawMultiPieChart(ctx, w, h, config) {
  var title = config.title || "";
  var labels = config.labels;

  // タイトル
  ctx.font = "bold 14px system-ui";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(title, w / 2, 20);

  var numPies = config.datasets.length;
  var pieW = w / numPies;
  var radius = Math.min(pieW * 0.3, h * 0.28);

  config.datasets.forEach(function(ds, pi) {
    var data = ds.data;
    var total = 0;
    data.forEach(function(v) { total += v; });

    var cx = pieW * pi + pieW / 2;
    var cy = h / 2;

    // サブタイトル（ds.totalがあればそちらを表示、なければdata合計）
    var displayTotal = ds.total != null ? ds.total : total;
    ctx.font = "bold 12px system-ui";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText(ds.label + "（計 " + displayTotal.toLocaleString() + (config.unit || "") + "）", cx, 40);

    // 扇形
    var startAngle = -Math.PI / 2;
    data.forEach(function(val, i) {
      var sliceAngle = (val / total) * Math.PI * 2;
      var endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      var midAngle = startAngle + sliceAngle / 2;
      var pct = Math.round(val / total * 100);
      if (pct >= 5) {
        var labelR = radius * 0.65;
        var lx = cx + labelR * Math.cos(midAngle);
        var ly = cy + labelR * Math.sin(midAngle);
        ctx.font = "bold 10px system-ui";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pct + "%", lx, ly);
      }
      startAngle = endAngle;
    });
  });

  // 共通凡例（下部）
  var legendY = h - 25;
  var totalLegendW = labels.length * 90;
  var legendStartX = (w - totalLegendW) / 2;
  ctx.font = "11px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  labels.forEach(function(label, i) {
    var x = legendStartX + i * 90;
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(x, legendY - 5, 10, 10);
    ctx.fillStyle = "#333";
    ctx.fillText(label, x + 14, legendY);
  });
}

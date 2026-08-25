// カテゴリ1: 推論（論理・命題）
// ============================================================
(function() {
  // 推論問題はパターンプール方式
  // 順序推論
  QUESTION_TEMPLATES.push({
    id: "suiron_order_01",
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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
    formats: ["webtesting", "testcenter"],
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

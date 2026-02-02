# 開発・UI実装ガイドライン

## リストビュー実装のルール

リストと詳細（List-Detail）形式の画面を実装する際、以下の挙動を遵守してください。

### 1. スクロール位置の維持
リスト内のアイテムを選択して詳細を表示するなどして画面を再描画（`render()`）する場合、必ず**リストのスクロール位置を維持**してください。

**悪い例:**
```javascript
render() {
  container.innerHTML = `...`; // DOMが全置換され、スクロール位置がリセットされる
}
```

**良い例 (推奨パターン):**
```javascript
render() {
    // 1. 現在のスクロール位置を取得
    const listEl = container.querySelector('.list-container');
    const scrollTop = listEl ? listEl.scrollTop : 0;

    // 2. 描画更新
    container.innerHTML = `...`; // またはDOM更新

    // 3. スクロール位置の復元
    const newListEl = container.querySelector('.list-container');
    if (newListEl) {
        newListEl.scrollTop = scrollTop;
    }
}
```
※ 仮想DOMや部分更新を使用しないバニラJS実装のため、この手動復元が必要です。


---

## データ管理のルール
- **Markdownをデータソースにしない**: 仕様書や辞書がMarkdownであっても、プログラムから読み込む際は必ず `.js` ファイル等の定数（CONSTANTS）としてハードコードしてください。Markdownのパースは禁止です。

---

## スタイル実装のルール (New)
UIのスタイリングにおいて、保守性と一貫性を保つため以下のルールを遵守してください。

### 1. 原則クラス指定（No Inline Styles）
JavaScript内で `element.style.xxx = '...'` のように直接スタイルを当てることを**原則禁止**とします。
代わりに `style.css` に適切なクラスを定義し、`classList.add('classname')` を使用してください。

**悪い例:**
```javascript
div.style.display = 'flex';
div.style.justifyContent = 'space-between';
div.style.padding = '10px';
div.style.background = '#fff';
```

**良い例:**
```javascript
// style.css
// .card-panel { display: flex; justify-content: space-between; padding: 10px; background: #fff; }

div.classList.add('card-panel');
```

### 2. 例外
以下のケースに限り、インラインスタイルの使用を許可します。
*   動的に値が変動するプロパティ（進捗バーの `width: ${percent}%` や、ドラッグ＆ドロップの座標など）。
*   特定の要素の表示/非表示の一時的な切り替え（`style.display = 'none'`）。

---

## コーディング規約 (Refactoring Rules)

### 1. コメントの日本語統一
*   コード内のコメントは原則として**日本語**で記述してください。
*   既存の英語コメントも、修正のタイミングで順次日本語に翻訳してください。

### 2. クリーンコード
*   **デバッグ用ログの削除**: `console.log` はデバッグ時のみ使用し、コミット時には必ず削除してください。必要なログ出力は `UIManager.log` 等を使用してください。
*   **不要なコメントの削除**: コードそのもので意図が明確な場合、 redundant なコメント（例: `// Initialize variable`）は削除してください。
*   **未使用コードの削除**: 使用されていない変数、関数、CSS定義は削除してください。

---

## テスト規約 (Testing Rules)

品質担保のため、以下のテスト規約を遵守してください。

### 1. フレームワーク
*   **Vitest** を使用します。
*   テストランナーは高速性とモダンな機能セット（ESMネイティブサポート等）を理由に選定されています。

### 2. ディレクトリ構成
テストファイルは実装ファイルと同じ階層ではなく、 `src/__tests__` 配下に集約して管理します。

```text
src/
  __tests__/
    models/       # モデルのユニットテスト
    services/     # 各サービスのビジネステスト
    integration/  # 統合テスト (GameLoop等)
    data/         # データ整合性テスト
```

### 3. テストの実行
以下のコマンドで全テストを実行できます。

```bash
npm test
```

### 4. 記述方針
*   **Unit Tests**: 各クラス/関数のロジックが仕様通りか確認します。特に確率計算や境界値（ランク昇格条件など）を重点的にテストしてください。
*   **Integration Tests**: `GameLoop` を通した一日のサイクル（進行→結果反映）が正常に動作するかを確認します。
*   **Mocking**: UI出力や外部依存（`ValidationService`等）は必要に応じて `vi.fn()` でモック化し、ロジックの検証に集中してください。

---

## ドキュメンテーション規約 (Documentation Rules)

### 1. JSDoc (必須)
すべてのクラス、メソッド、および主要な関数には、以下の形式で **JSDoc** コメントを記述してください。

*   **言語**: 日本語
*   **必須タグ**:
    *   `@param`: 引数の型と説明
    *   `@returns`: 戻り値の型と説明（voidでも記述推奨）
*   **記述例**:

```javascript
/**
 * ギルドの資金を追加します。
 * @param {number} amount - 追加する金額
 * @returns {void}
 */
addMoney(amount) {
    this.money += amount;
}
```

### 2. インラインコメント
*   複雑なロジックのブロックには、その「意図（Why）」を説明するコメントを記述してください。「何をしているか（What）」はコードで表現してください。

---

## リファクタリング指針 (Refactoring Guidelines)

### 1. マジックナンバーの排除
*   コード内に直接記述された数値（リテラル）は、必ず `src/data/constants.js` または各クラスの `static` 定数として定義し、名前付き定数として使用してください。
    *   **悪い例**: `if (reputation > 1000)`
    *   **良い例**: `if (reputation > CONSTANTS.RANK.S_THRESHOLD)`

### 2. マジックストリングの排除
*   ユーザーに表示するメッセージや、ロジックで使用する特定の文字列キーも、定数化または設定ファイルへの切り出しを検討してください。


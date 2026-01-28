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

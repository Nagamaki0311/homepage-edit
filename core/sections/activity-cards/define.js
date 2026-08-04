// core/sections/activity-cards/define.js
// teate1122 のような「活動」紹介（キャンドル制作/イベント出店/ワークショップ等）をカード表示するためのセクション。

export const define = {
  type: "activity-cards",
  label: "活動カード",
  fields: [
    { key: "heading", label: "見出し", type: "text" },
    { key: "items", label: "カード一覧", type: "list", itemFields: [
      { key: "title", label: "タイトル", type: "text" },
      { key: "description", label: "説明", type: "textarea" },
    ] },
  ],
  defaultProps: {
    heading: "活動",
    items: [
      { title: "活動1", description: "説明テキストです。" },
      { title: "活動2", description: "説明テキストです。" },
      { title: "活動3", description: "説明テキストです。" },
    ],
  },
};

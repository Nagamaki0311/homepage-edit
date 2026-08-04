// core/sections/hero/define.js
// セクションのプロパティ定義（エディタのフォーム生成・デフォルト値に使用）。

export const define = {
  type: "hero",
  label: "ヒーロー",
  fields: [
    { key: "heading", label: "見出し", type: "text" },
    { key: "body", label: "本文", type: "textarea" },
    { key: "image", label: "背景/添付画像", type: "image" },
    { key: "cta.label", label: "ボタン文言", type: "text" },
    { key: "cta.href", label: "リンク先", type: "text" },
  ],
  defaultProps: {
    heading: "見出しテキスト",
    body: "本文テキストです。",
    image: null,
    cta: { label: "", href: "" },
  },
};

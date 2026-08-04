// core/sections/text/define.js

export const define = {
  type: "text",
  label: "テキスト",
  fields: [
    { key: "heading", label: "見出し（任意）", type: "text" },
    { key: "body", label: "本文", type: "textarea" },
  ],
  defaultProps: { heading: "", body: "本文テキストです。" },
};

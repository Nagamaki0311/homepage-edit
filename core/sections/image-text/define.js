// core/sections/image-text/define.js

export const define = {
  type: "image-text",
  label: "画像＋テキスト",
  fields: [
    { key: "heading", label: "見出し（任意）", type: "text" },
    { key: "body", label: "本文", type: "textarea" },
    { key: "image", label: "画像", type: "image" },
    {
      key: "imagePosition",
      label: "画像の位置",
      type: "select",
      options: ["left", "right"],
    },
  ],
  defaultProps: {
    heading: "",
    body: "本文テキストです。",
    image: null,
    imagePosition: "left",
  },
};

// core/sections/contact-social/define.js
// お問い合わせ情報・SNSリンクは site.json の contact / social を参照する。
// このセクション自体が持つプロパティは見出し・案内文と表示切替のみ。

export const define = {
  type: "contact-social",
  label: "お問い合わせ・SNS",
  fields: [
    { key: "heading", label: "見出し", type: "text" },
    { key: "body", label: "案内文", type: "textarea" },
    { key: "showEmail", label: "メールアドレスを表示", type: "boolean" },
    { key: "showSocial", label: "SNSリンクを表示", type: "boolean" },
    { key: "showForm", label: "お問い合わせフォームを表示（site.jsonのcontact.formProviderが netlify の場合のみ）", type: "boolean" },
  ],
  defaultProps: {
    heading: "お問い合わせ",
    body: "",
    showEmail: true,
    showSocial: true,
    showForm: true,
  },
};

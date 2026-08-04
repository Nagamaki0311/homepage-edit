// core/sections/index.js
// セクション種別のレジストリ。依存ゼロ・ブラウザ/Node共有。
// 新しいセクションを追加する場合はディレクトリを1つ追加し、ここに1行加えるだけでよい。

import { define as heroDefine } from "./hero/define.js";
import { render as heroRender, css as heroCss } from "./hero/render.js";
import { define as textDefine } from "./text/define.js";
import { render as textRender, css as textCss } from "./text/render.js";
import { define as imageTextDefine } from "./image-text/define.js";
import { render as imageTextRender, css as imageTextCss } from "./image-text/render.js";
import { define as contactSocialDefine } from "./contact-social/define.js";
import { render as contactSocialRender, css as contactSocialCss } from "./contact-social/render.js";
import { define as activityCardsDefine } from "./activity-cards/define.js";
import { render as activityCardsRender, css as activityCardsCss } from "./activity-cards/render.js";

export const sections = {
  hero: { define: heroDefine, render: heroRender, css: heroCss },
  text: { define: textDefine, render: textRender, css: textCss },
  "image-text": { define: imageTextDefine, render: imageTextRender, css: imageTextCss },
  "contact-social": { define: contactSocialDefine, render: contactSocialRender, css: contactSocialCss },
  "activity-cards": { define: activityCardsDefine, render: activityCardsRender, css: activityCardsCss },
};

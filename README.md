# ssw2-exam — リダイレクトのみ

練習アプリ本体はここには**無い**。2026-08-19 に corporate-site へ移設した。

- 本番: <https://avecvous-evolve.com/exam/>
- アプリのソース: `evolveosaka-dev/ssw2-exam-app`(private)+ `corporate-site/public/exam/index.html`

このリポジトリが存在する理由は1つだけ: 旧URL
<https://evolveosaka-dev.github.io/ssw2-exam/> が**すでに送信ずみの案内メールに
載っている**ため。`index.html` はクエリ文字列を保ったまま新URLへ 302 する。

⚠️ ここにアプリのコードやデータを置かないこと。public リポジトリなので、置けば
移設(有料コンテンツを API の裏へ隠す)の意味が無くなる。

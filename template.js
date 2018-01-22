function makeHtml(num,id) {
    let labels = '';
    for (let i = 0; i < num; i++) {
        labels += `<img src="imgs/${id}/${i}.png" alt="" />\n`;
    }
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Document</title>
    </head>
    <body>
        <div style="width: 750px;margin:auto">
            ${labels}
        </div>
    </body>
    </html>
    `
}

module.exports = makeHtml;
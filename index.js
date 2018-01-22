const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const fs = require('fs');
const makeHtml = require('./template');
const opn = require('opn');

puppeteer.launch().then(async browser => {
    const page = await browser.newPage();
    //链接必须是这种形式，只有id的值可以不一样，不然截图会异常，不知道为什么。
    const url = 'https://item.taobao.com/item.htm?id=43995057146'
    const params = url.split('?')[1].split('&');
    const id = params.filter(item => item.indexOf('id') === 0)[0].split('=')[1];
    let baseUrl = __dirname + '/imgs';
    //没有则创建imgs文件夹
    if (!fs.existsSync(baseUrl)) {
        fs.mkdirSync(baseUrl);
    }
    baseUrl += '/' + id;
    //没有则创建每个商品ID对应的文件夹
    if (!fs.existsSync(baseUrl)) {
        fs.mkdirSync(baseUrl);
    }
    await page.setJavaScriptEnabled(true);
    console.log('加载页面...');
    await page.goto(url);
    console.log('加载全部商品图片...');
    //因为淘宝商品图片很多是懒加载的，不能直接就进行截图
    const imgs = await page.$$eval('img', imgs => Promise.all(
        imgs.map(img => {
            if (img.getAttribute('data-ks-lazyload')) {
                img.src = img.getAttribute('data-ks-lazyload');
                return new Promise(resolve => img.onload = resolve);
            } else {
                return new Promise(resolve => resolve())
            }

        })
    ));

    //获取所有要截图的位置的信息
    let boundingClientRects = await page.evaluate(() => {
        let children = document.querySelector('#J_SubWrap').children;
        let clips = [];
        let getBCR = function (node, clips) {
            let imgs = node.querySelectorAll('img');
            if (node.nodeName === 'IMG' || imgs.length === 0) {
                let boundingClientRect = node.getBoundingClientRect();
                if (boundingClientRect.height > 0 && boundingClientRect.width > 0) {
                    clips.push(node.getBoundingClientRect());
                }
            } else {
                let children = node.children;
                for (let i = 0; i < children.length; i++) {
                    getBCR(children[i], clips);
                }
            }
        }

        let traverseNode = function (node, clips) {
            for (let i = 0; i < node.length; i++) {
                let c = node[i], boundingClientRect;
                boundingClientRect = c.getBoundingClientRect();

                getBCR(c, clips)
            }
        }
        traverseNode(children, clips)
        return JSON.parse(JSON.stringify(clips));
    });

    //合并在同一行的位置，将这些位置截成一张图片
    let mergeBoundingClientRects = function (result, current) {
        let prev = result[result.length - 1];
        if (prev === undefined) {
            result.push(current);
            return result;
        }
        if ((prev.y >= current.y && prev.y < current.bottom) || (current.y >= prev.y && current.y < prev.bottom)) {
            prev.y = Math.min(prev.y, current.y);
            prev.bottom = Math.max(prev.bottom, current.bottom);
            prev.x = Math.min(prev.x, current.x);
            prev.height = prev.bottom - prev.y;
        } else {
            result.push(current);
        }
        return result;
    }

    //开始合并
    boundingClientRects = boundingClientRects.reduce(function (result, clip) {
        return mergeBoundingClientRects(result, clip);
    }, []);

    //获取容器的位置信息
    const size = await page.evaluate(() => {
        return JSON.parse(JSON.stringify(document.querySelector('#J_SubWrap').getBoundingClientRect()))
    });

    console.log('开始截图...');
    let promises = await boundingClientRects.map((element, index) => {
        let clip = {};
        clip.y = element.y;
        clip.height = element.height;
        clip.width = size.width;
        clip.x = size.left;
        return page.screenshot({ path: `${baseUrl}/${index}.png`, clip });
    });

    Promise.all(promises).then(function () {
        console.log('截图完成');
        fs.writeFile('index.html', makeHtml(boundingClientRects.length, id), function (err) {
            opn(__dirname + '/index.html');
        });
        browser.close();
    });
});
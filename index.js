const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const fs = require('fs');
puppeteer.launch().then(async browser => {
    const page = await browser.newPage();
    const url = 'https://item.taobao.com/item.htm?spm=a230r.1.14.144.bae5a3bVLDVLR&id=547855624262&ns=1&abbucket=7#detail'
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

    let boundingClientRects = await page.evaluate(() => {
        let children = document.querySelector('#J_SubWrap').children;
        let clips = [];
        let getBCR = function (node, clips) {
            let imgs = node.querySelectorAll('img');
            if (node.nodeName === 'IMG' || imgs.length === 0) {
                clips.push(node.getBoundingClientRect());
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
                if (boundingClientRect.height > 0 && boundingClientRect.width > 0) {
                    getBCR(c, clips)
                }
            }
        }
        traverseNode(children, clips)
        return JSON.parse(JSON.stringify(clips));
    });

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

    boundingClientRects = boundingClientRects.reduce(function (result, clip) {
        return mergeBoundingClientRects(result, clip);
    }, []);

    console.log('开始截图...');
    let promises = await boundingClientRects.map(async (element, index) => {
        let clip = {};
        clip.y = element.y + 266;
        clip.height = element.height;
        clip.width = 750;
        clip.x = 194;
        await page.screenshot({ path: `${baseUrl}/${index}.png`, clip });
        console.log(`第${index + 1}张截图成功`);
    });

    Promise.all(promises).then(function () {
        browser.close();
    });
});
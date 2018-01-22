# TaobaoScreenshots
将淘宝商品详情页完整的截成一张张可以直接上传到淘宝的图片

## 难点一 淘宝商品详情页，很多图片是懒加载的，如何保证截图的时候，图片信息已经全部加载完成。

观察淘宝页面可以发现，懒加载的图片地址在IMG的`data-ks-lazyload`属性中。

于是我们可以获取页面中的所有具有这个属性的img标签，改变img的src强制它加载图片。代码如下：


      
    const imgs = await page.$$eval('img', imgs =>   
          Promise.all(
        imgs.map(img => {
            if (img.getAttribute('data-ks-lazyload')) {
                img.src = img.getAttribute('data-ks-lazyload');
                return new Promise(resolve => img.onload = resolve);
            } else {
                return new Promise(resolve => resolve())
            }

        })
    ));

## 难点二 如何截取图片？

我的想法：截取页面时，1.如果原本是图片的，就截取成同样大小的图片。2.如果是文字的，就截取整个段落。 

获取每个段落或图片位置的代码如下：

    let boundingClientRects = await page.evaluate(() => {
        let children = document.querySelector('#J_SubWrap').children;
        let clips = [];
        ...
        ...
        traverseNode(children, clips)
        return JSON.parse(JSON.stringify(clips));
    });

## 难点三： 如果一行中，既有图片又有文字，或者多张图片在同一行（不一定要同一水平线）,如何截成一张图片？

合并同一行的多个截图为一张图片：

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

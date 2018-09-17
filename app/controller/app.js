const fs = require('fs');
const puppeteer = require('puppeteer');

let mainPage = 'http://eoddata.com/stocklist/NYSE/A.htm';

(async function stockTickerExtractor() {
    console.log('Please be patient until the extraction will get complete, it can last up to 45 seconds');
    
    let browser = await puppeteer.launch({
        headless: true,
        timeout : 3000000
    });
    let page = await goToAPage(browser, mainPage);

    let urlsForMoreStockTickersArr = await extractUrlsForMoreStockTickers(page);

    extractStockTickersFromAllPages(browser, urlsForMoreStockTickersArr)
    .then(stockTickersArrs => {
        browser.close();

        let allStockTickersArr = [].concat(...stockTickersArrs);

        writeStockTickersToJsonFile(allStockTickersArr)
    })
})();

async function goToAPage(browser, gotToUrl) {
    let pageHaseLodadedIndicator = '.quotes tbody';
    let page = await browser.newPage();

    await page.setExtraHTTPHeaders({Referer: 'https://workingatbooking.com/vacancies/'})
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.79 Safari/537.36');
    
    await page.goto(gotToUrl, {timeout: 3000000});
    await page.waitForSelector(pageHaseLodadedIndicator);

    return page;
}

async function extractUrlsForMoreStockTickers(page) {
    let urlsForMoreStockTickersArr = await page.evaluate(function(){
        let paginationAnchors = document.querySelectorAll('.lett tbody tr td a');
        let urlsForMoreStockTickersArr = [];

        paginationAnchors.forEach((anchorTag) => {
            let url = anchorTag.href;
            urlsForMoreStockTickersArr.push(url);
        });

        return urlsForMoreStockTickersArr;
    });

    return urlsForMoreStockTickersArr
}

function extractStockTickersFromAllPages(browser, urlsForMoreStockTickersArr) {
    let allUrlsCount = urlsForMoreStockTickersArr.length;
    let pagesToExtract = []
    let allConcurrentExtractions = [];

    for (let i = 0; i < allUrlsCount; i++) {
        let currUrl = urlsForMoreStockTickersArr[i];
        allConcurrentExtractions.push(executeStockExtractionOnPage(browser, currUrl))
    }

    return Promise.all(allConcurrentExtractions);
}

function executeStockExtractionOnPage(browser, url) {
    return new Promise(resolve => {
        goToAPage(browser, url)
        .then(page => {
            return extractStockTickersOnPage(page);
        })
        .then(stockTickersArr => {
            resolve(stockTickersArr);
        });
    })
}

function extractStockTickersOnPage(page) {
    return page.evaluate(function(){
        let stockTicersCont = document.querySelector('.quotes tbody');
        let stockTicersContChildren = stockTicersCont.children;
        let stockTicersContChildrenCount = stockTicersCont.children.length;
        let stockTickersArr = [];

        for (let i = 1; i < stockTicersContChildrenCount; i++) {
            stockTickersArr.push(stockTicersContChildren[i].children[0].innerText);
        }

        return stockTickersArr;
    })
}

function writeStockTickersToJsonFile(stockTickersArr) {
    let stockTickersArrJson = JSON.stringify(stockTickersArr);

    fs.writeFile('../modell/stockTicker.json', stockTickersArrJson, (err) => {
        if (err) console.log(err);
        console.log('stock tickers are written into stockTicker.json');
    })
}
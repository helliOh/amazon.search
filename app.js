const axios = require('axios')
const cheerio = require('cheerio');
const fs = require('fs');

const root = `https://www.amazon.com/`;
const silenceMode = false;
const saveAsFileFlag = false;

function searchKeyword(keyword){ return root + `s?k=${keyword}` };

async function wait(ms){
    return new Promise((resolve, reject) =>{
        setTimeout(() =>{ resolve() }, ms);
    });
}

async function downloadImage (url, image_path){
  axios({ url, responseType: 'stream' }).then(
    response =>
      new Promise((resolve, reject) => {
        response.data
        .pipe(fs.createWriteStream(image_path))
        .on('finish', () => resolve())
        .on('error', e => reject(e));
      })
    )
}

async function getPageCount(keyword){
    return new Promise(async (resolve, reject) =>{
        try{
            const mainPageURL = searchKeyword(keyword); 
            if(!silenceMode) console.log(`GET\t${mainPageURL}`);
            if(!silenceMode) console.log(`\nCounting pages...`);
            
            const mainPage = await axios.get(mainPageURL);
            const mainPageDOM = mainPage.data;
            
            const $ = cheerio.load(mainPageDOM);
            const endPageElement = $('ul.a-pagination li.a-disabled').toArray()[1];
            const end = $(endPageElement).text();
            
            if(!silenceMode) console.log(`Search Keyword has ${end} pages`);
            
            resolve(end);
        }
        catch(e){
            console.log(e);
            reject();
        }
    })
}

async function collectPages(keyword, pageEnd){
    return new Promise(async (resolve, reject) =>{
        const mainPageURL = searchKeyword(keyword); 
        let buffer = [];
        let missingPages = [];

        for(let i=1; i<=pageEnd; i++){
            wait(10000);
            const pageURL = mainPageURL + `&page=${i}`;
            if(!silenceMode) console.log(`GET\t${pageURL}\t(${i}/${pageEnd})`);

            try{
                const page = await axios.get(pageURL);
                const pageDOM = page.data;
                buffer.push({
                    pageNumber : i,
                    pageURL : pageURL,
                    data : pageDOM
                });
            }
            catch(e){
                console.log(e);
                missingPages.push(i); 
            }
        }
        
        resolve({
            data : buffer,
            missingPages : missingPages
        });
    })
}

function saveAsFile(data){
    if(!fs.existsSync("html")){
        fs.mkdirSync("html", 0766, function(err){
            if(err){
                console.log(err);
                response.send("ERROR! Can't make the directory! \n");
            }
        });
    }

    const pages = data.data;

    for(i in pages){
        const page = pages[i];
        const pageNumber = page.pageNumber;
        const url = page.pageURL;
        const html = page.data;
        if(!silenceMode) console.log(`Saving ${url} as ${pageNumber}.html`);
        fs.writeFileSync(`./html/${pageNumber}.html`, html);
    }
}

async function run(keyword){
    return new Promise(async (resolve, reject) =>{
        try{
            const pageCount = await getPageCount(keyword);
            if(!silenceMode) console.log('\nCollecting pages...');
            const pages = await collectPages(keyword, pageCount);
            if(!silenceMode) console.log('');
            if(!silenceMode) console.log(`Total Success Page: ${pages.data.length}`);
            if(!silenceMode) console.log(`Total Missing Page : ${pages.missingPages.length}`);
            
            resolve(pages);
        }
        catch(e){
            console.log(e);
            reject(e);
        }
    });
}

async function keywordFetch(data){
    if(!fs.existsSync("images")){
        fs.mkdirSync("images", 0766, function(err){
            if(err){
                console.log(err);
                response.send("ERROR! Can't make the directory! \n");
            }
        });
    }

    const pages = data.data;

    for(i in pages){
        const page = pages[i];
        const pageNumber = page.pageNumber;
        const url = page.pageURL;
        const html = page.data;

        const $ = cheerio.load(html);

        const products =  $("div.s-result-list .sg-col-inner").toArray();
        
        const data = products.map((product) =>{
            const $Product = cheerio.load(product);

            const image = $Product("img").attr('src');
            const name = $Product("h2 span").text();
            const price = $Product(".a-price .a-offscreen").text();

            return {
                image : image,
                name : name, 
                price : price
            }
        });

        let stringData = data.map(item => `${item.image},  ${item.name}, ${item.price}`).reduce((acc, cur) => `${acc}\n\r${cur}`);

        console.log(stringData);
    }
}

run('sulhwasoo')
.then(async (result) =>{
    if(saveAsFileFlag) saveAsFile(result);
    keywordFetch(result);
})
.catch(async (e) =>{
    console.log(e);
});
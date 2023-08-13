import puppeteer from 'puppeteer';
import { Book } from "../models/book";
import { extractAsinFromUrl } from "../helpers/amazon";

function isValidUrl(url: string): boolean {
    const urlPattern = /^https:\/\/[^\s/$.?#].[^\s]*$/i;
    return urlPattern.test(url);
  }

export const amazonServices = {
  async scrapingAmazonProductData(urls: Array<string>): Promise<Array<Book>> {
    const bookList: Array<Book> = []
    const browser = await puppeteer.launch({
      headless: "new",
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setViewport({
      width: 1080,
      height: 480,
    })
    for (const url of urls) {
      try {
        await page.goto(url);
        const hardCoverHrefElement = await page.$("#tmm-grid-swatch-HARDCOVER a")
        const toHardCoverBookUrl = await hardCoverHrefElement?.evaluate(el => el.href) ?? ""
        const paperbackHrefElement = await page.$("#tmm-grid-swatch-PAPERBACK a")
        const toPaperbackBookUrl = await paperbackHrefElement?.evaluate(el => el.href) ?? ""
        if (isValidUrl(toHardCoverBookUrl)) {
          // 電子本ページだとisbnが取れないので物理本ページへ遷移（ハードカバー）
          await page.goto(toHardCoverBookUrl)
        } else if (isValidUrl(toPaperbackBookUrl)) {
          // 電子本ページだとisbnが取れないので物理本ページへ遷移（ソフトカバー）
          await page.goto(toPaperbackBookUrl)
        }
        const [title, authors, publisher, rawPublicationDate, isbn, thumbnail, ebookThumbnail] = await Promise.all([
          page.$eval('#productTitle', element => element.textContent?.trim()),
          page.$$eval('.author > a', elements => {
            return elements.map(element => element.textContent?.trim()).join(', ');
          }),
          page.$eval("#rpi-attribute-book_details-publisher .rpi-attribute-value", element => element.textContent?.trim()).catch(() => {
            console.warn(`Not publisher: ${url}`);
            return
          }),
          page.$eval("#rpi-attribute-book_details-publication_date .rpi-attribute-value", element => element.textContent?.trim()),
          page.$eval("#rpi-attribute-book_details-isbn13 .rpi-attribute-value", element => element.textContent?.trim()).catch(() => {
            console.warn(`Not isbn13: ${url}`);
            return
          }),
          page.$eval("img#imgBlkFront", element => element.src).catch(() => {
            return
          }),
          page.$eval("img#ebooksImgBlkFront", element => element.src).catch(() => {
            return
          }),
        ]);

        const publicationDate = rawPublicationDate ? new Date(rawPublicationDate).toISOString().split("T")[0] : "";

        bookList.push({
          title: title ?? "",
          authors,
          publisher: publisher ?? "",
          publicationDate,
          isbn: isbn ?? "",
          asin: extractAsinFromUrl(url),
          amazonUrl: url,
          thumbnail: thumbnail ?? ebookThumbnail ?? "",
          tags: null,
          memo: null,
          closedAt: null,
          createdAt: null,
          updatedAt: null,
        })
      } catch (error) {
        console.error(`Failed to fetch data for URL: ${url}. Error: ${error}`);
      }
    }
    await browser.close();
    return bookList
  }
}

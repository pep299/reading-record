import { Client } from "@notionhq/client";
import { amazonServices } from '../services/amazon';
import { convertAsinToProductUrl, extractAsinFromUrl } from '../helpers/amazon';
import { notionServices } from '../services/notion';

export const registerApplication = {
  async register(inputs: Array<string>) {
    const asinList = inputs.map(url => extractAsinFromUrl(url)).filter(asin => !!asin);
    if (asinList.length == 0) {
      // not amazon urls
      return
    }

    const databaseId = process.env.DATABASE_ID
    if (!databaseId) {
      throw new Error("not set DATABASE_ID");
      
    }
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });

    const response = await notionServices.queryDatabase(notion, databaseId)
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
    const readingList = notionServices.convertBookList(response)
    console.log("======== registered books =========")
    const registeredAsinList = readingList.map(reading => reading.asin)
    console.log(registeredAsinList)
    const deduplicatedAsinList = [...new Set(asinList)]
    const targetAsinList = deduplicatedAsinList.filter(asin => !(registeredAsinList.includes(asin)))
    if (targetAsinList.length == 0) {
      // inputs all registered
      return
    }
    
    const amazonUrlList = convertAsinToProductUrl(targetAsinList)
    console.log(amazonUrlList)

    const bookList = await amazonServices.scrapingAmazonProductData(amazonUrlList)
    console.log("======== staging books =========")
    console.log(bookList)

    const readingIsbnList = readingList.map(reading => reading.isbn)
    const readingTitleList = readingList.map(reading => reading.title)
    const targetBookList = bookList.filter(book => book.isbn ? !(readingIsbnList.includes(book.isbn)) : !(readingTitleList.includes(book.title)))
    if (targetBookList.length == 0) {
      // inputs all registered
      return
    }

    const propertiesList = notionServices.convertCreateParameters(targetBookList)
    await notionServices.createPages(notion, databaseId, propertiesList)
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}
